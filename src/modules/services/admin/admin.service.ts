import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto } from 'src/modules/dtos';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerProfile } from 'src/entities/partner-profile.entity';
import { ServicePoint } from 'src/entities/service-point.entity';
import { Trip } from 'src/entities/trip.entity';
import { User } from 'src/entities/user.entity';
import { UserRole } from 'src/utils/user-role.enum';
import { Repository, Raw } from 'typeorm';
import { TripStatus } from 'src/utils/trips-status-enum';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(ServicePoint) private serviceRepo: Repository<ServicePoint>,
        @InjectRepository(Trip) private tripRepo: Repository<Trip>,
        @InjectRepository(PartnerProfile) private profileRepo: Repository<PartnerProfile>,
    ) { }

    async getUsers(role: UserRole | undefined, page: number = 1, limit: number = 10) {
        const query = this.userRepo.createQueryBuilder('user');

        if (role) {
            query.where('user.role = :role', { role });
        }

        // Include relations based on roles
        query.leftJoinAndSelect('user.partnerProfile', 'partnerProfile');
        query.leftJoinAndSelect('user.servicePoints', 'servicePoints');

        query.orderBy('user.created_at', 'DESC');
        query.skip((page - 1) * limit);
        query.take(limit);

        const [users, total] = await query.getManyAndCount();

        // Strip password hash
        const safeUsers = users.map(u => {
            const { password_hash, ...rest } = u;
            return rest;
        });

        return {
            data: safeUsers,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getUserById(id: string) {
        const user = await this.userRepo.findOne({
            where: { id },
            relations: ['partnerProfile', 'servicePoints']
        });

        if (!user) throw new NotFoundException('User not found');

        const { password_hash, ...rest } = user;
        return rest;
    }

    async createUser(dto: CreateUserDto) {
        if (dto.role === UserRole.ADMIN) {
            throw new ForbiddenException('Cannot create ADMIN user via this API');
        }

        const existingUser = await this.userRepo.findOne({ where: { username: dto.username } });
        if (existingUser) {
            throw new BadRequestException('Username already exists');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const newUser = this.userRepo.create({
            username: dto.username,
            password_hash: hashedPassword,
            full_name: dto.full_name,
            role: dto.role,
            tax_id: dto.tax_id,
        });

        const savedUser = await this.userRepo.save(newUser);

        // If creating a PARTNER, create a profile
        // If creating a PARTNER or INTRODUCER, create a profile
        if (dto.role === UserRole.PARTNER || dto.role === UserRole.INTRODUCER) {
            const profile = this.profileRepo.create({
                user: savedUser,
                vehicle_plate: dto.role === UserRole.PARTNER ? (dto.vehicle_plate || 'Updating...') : (dto.vehicle_plate || 'No Plate'),
                brand: dto.brand || null,
                id_card_front: dto.id_card_front || null,
                id_card_back: dto.id_card_back || null,
                driver_license_front: dto.driver_license_front || null,
                driver_license_back: dto.driver_license_back || null,
                is_online: false,
                wallet_balance: 0,
                // Default location (e.g., center of HCMC)
                current_location: Raw(() => "ST_GeomFromText('POINT(10.776111 106.701111)', 4326)") as any,
            });
            await this.profileRepo.save(profile);
        }

        // If creating a CUSTOMER, create a default service point
        if (dto.role === UserRole.CUSTOMER) {
            const latitude = dto.latitude || 10.776111;
            const longitude = dto.longitude || 106.701111;

            const servicePoint = this.serviceRepo.create({
                owner: savedUser,
                name: dto.full_name,
                address: dto.address || 'Chưa cập nhật...',
                reward_amount: dto.reward_amount !== undefined ? Number(dto.reward_amount) : 50000,
                advertising_budget: 0,
                geofence_radius: dto.geofence_radius !== undefined ? Number(dto.geofence_radius) : 100,
                location: `POINT(${latitude} ${longitude})`,
            });
            await this.serviceRepo.save(servicePoint);
        }

        return { message: 'Tạo tài khoản thành công', userId: savedUser.id };
    }

    async updateUser(id: string, dto: UpdateUserDto) {
        const user = await this.userRepo.findOne({
            where: { id },
            relations: ['partnerProfile', 'servicePoints']
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Update common fields
        if (dto.full_name) user.full_name = dto.full_name;
        // if (dto.is_active !== undefined) user.is_active = dto.is_active;
        if (dto.password) {
            user.password_hash = await bcrypt.hash(dto.password, 10);
        }

        await this.userRepo.save(user);

        // Update Partner/Introducer Profile
        if ((user.role === UserRole.PARTNER || user.role === UserRole.INTRODUCER) && user.partnerProfile) {
            const profile = user.partnerProfile;
            if (dto.vehicle_plate) profile.vehicle_plate = dto.vehicle_plate;
            if (dto.brand) profile.brand = dto.brand;
            if (dto.driver_license_front) profile.driver_license_front = dto.driver_license_front;
            if (dto.driver_license_back) profile.driver_license_back = dto.driver_license_back;
            if (dto.id_card_front) profile.id_card_front = dto.id_card_front;
            if (dto.id_card_back) profile.id_card_back = dto.id_card_back;

            await this.profileRepo.save(profile);
        }

        // Update Service Point (Customer)
        if (user.role === UserRole.CUSTOMER && user.servicePoints && user.servicePoints.length > 0) {
            // Update the primary service point (first one)
            const servicePoint = user.servicePoints[0];
            if (dto.address) servicePoint.address = dto.address;
            if (dto.reward_amount !== undefined) servicePoint.reward_amount = dto.reward_amount;
            if (dto.advertising_budget !== undefined) servicePoint.advertising_budget = dto.advertising_budget;
            if (dto.geofence_radius !== undefined) servicePoint.geofence_radius = dto.geofence_radius;
            if (dto.latitude && dto.longitude) {
                servicePoint.location = `POINT(${dto.latitude} ${dto.longitude})`;
            }

            await this.serviceRepo.save(servicePoint);
        }

        return { message: 'User updated successfully' };
    }

    async getPartnerStats(range: string) {
        const query = this.tripRepo.createQueryBuilder('trip')
            .leftJoinAndSelect('trip.partner', 'partner')
            .where('trip.status NOT IN (:...statuses)', { statuses: [TripStatus.PENDING_CONFIRMATION, TripStatus.REJECTED] })
            .select([
                'partner.id',
                'partner.full_name',
                'COUNT(trip.trip_id) as totalTrips',
                'SUM(trip.actual_guest_count) as totalGuests',
                'SUM(trip.reward_snapshot) as totalPoints'
            ])
            .groupBy('partner.id')
            .addGroupBy('partner.full_name');

        const now = new Date();
        let startDate: Date | undefined;
        let endDate: Date | undefined;

        switch (range) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                endDate = new Date(now.setHours(23, 59, 59, 999));
                break;
            case 'yesterday':
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                startDate = new Date(yesterday.setHours(0, 0, 0, 0));
                endDate = new Date(yesterday.setHours(23, 59, 59, 999));
                break;
            case '7_last_days':
                const sevenDaysAgo = new Date(now);
                sevenDaysAgo.setDate(now.getDate() - 7);
                startDate = new Date(sevenDaysAgo.setHours(0, 0, 0, 0));
                endDate = new Date();
                break;
            case 'this_month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            default:
                break;
        }

        if (startDate && endDate) {
            query.andWhere('trip.updated_at BETWEEN :startDate AND :endDate', { startDate, endDate });
        }

        query.limit(3);

        const stats = await query.getRawMany();

        return stats.map(stat => ({
            partnerId: stat.partner_id,
            partnerName: stat.partner_full_name,
            totalTrips: Number(stat.totalTrips),
            totalGuests: Number(stat.totalGuests) || 0,
            totalPoints: Number(stat.totalPoints) || 0,
        }));
    }

    async getServicePointStats(range: string) {
        const query = this.tripRepo.createQueryBuilder('trip')
            .leftJoinAndSelect('trip.servicePoint', 'servicePoint')
            .select([
                'servicePoint.id',
                'servicePoint.name',
                'COUNT(trip.trip_id) as totalTrips',
                'SUM(trip.actual_guest_count) as totalGuests',
                `SUM(CASE WHEN trip.status != '${TripStatus.REJECTED}' THEN trip.reward_snapshot ELSE 0 END) as totalPoints`
            ])
            .groupBy('servicePoint.id')
            .addGroupBy('servicePoint.name');

        const now = new Date();
        let startDate: Date | undefined;
        let endDate: Date | undefined;

        switch (range) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                endDate = new Date(now.setHours(23, 59, 59, 999));
                break;
            case 'yesterday':
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                startDate = new Date(yesterday.setHours(0, 0, 0, 0));
                endDate = new Date(yesterday.setHours(23, 59, 59, 999));
                break;
            case '7_last_days':
                const sevenDaysAgo = new Date(now);
                sevenDaysAgo.setDate(now.getDate() - 7);
                startDate = new Date(sevenDaysAgo.setHours(0, 0, 0, 0));
                endDate = new Date();
                break;
            case 'this_month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            default:
                break;
        }

        if (startDate && endDate) {
            query.andWhere('trip.created_at BETWEEN :startDate AND :endDate', { startDate, endDate });
        }

        query.limit(3);

        const stats = await query.getRawMany();

        return stats.map(stat => ({
            servicePointId: stat.servicePoint_id,
            servicePointName: stat.servicePoint_name,
            totalTrips: Number(stat.totalTrips),
            totalGuests: Number(stat.totalGuests) || 0,
            totalCost: Number(stat.totalPoints) || 0,
        }));
    }
}