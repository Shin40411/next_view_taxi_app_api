import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto } from 'src/modules/dtos/register-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerProfile } from 'src/entities/partner-profile.entity';
import { ServicePoint } from 'src/entities/service-point.entity';
import { Trip } from 'src/entities/trip.entity';
import { User } from 'src/entities/user.entity';
import { BankAccount } from 'src/entities/bank-account.entity';
import { UserRole } from 'src/utils/user-role.enum';
import { Repository } from 'typeorm';
import { TripStatus } from 'src/utils/trips-status-enum';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(ServicePoint) private serviceRepo: Repository<ServicePoint>,
        @InjectRepository(Trip) private tripRepo: Repository<Trip>,
        @InjectRepository(PartnerProfile) private profileRepo: Repository<PartnerProfile>,
        @InjectRepository(BankAccount) private bankRepo: Repository<BankAccount>,
    ) { }

    async getUsers(role: UserRole | undefined, page: number = 1, limit: number = 10, search?: string, province?: string) {
        const query = this.userRepo.createQueryBuilder('user');

        if (role) {
            query.where('user.role = :role', { role });
        }

        // Include relations based on roles
        query.leftJoinAndSelect('user.partnerProfile', 'partnerProfile');
        query.leftJoinAndSelect('user.servicePoints', 'servicePoints');
        query.leftJoinAndSelect('user.bankAccount', 'bankAccount');

        if (search) {
            query.andWhere('(user.full_name LIKE :search OR user.username LIKE :search)', { search: `%${search}%` });
        }

        if (role === UserRole.CUSTOMER && province) {
            query.andWhere('servicePoints.province = :province', { province });
        }

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
            relations: ['partnerProfile', 'servicePoints', 'bankAccount']
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
            throw new BadRequestException('Thông tin tài khoản đã tồn tại');
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

        if (dto.role === UserRole.PARTNER || dto.role === UserRole.INTRODUCER) {
            const profile = this.profileRepo.create({
                user: savedUser,
                vehicle_plate: dto.role === UserRole.PARTNER ? (dto.vehicle_plate || 'Updating...') : (dto.vehicle_plate || ''),
                brand: dto.brand || null,
                id_card_front: dto.id_card_front || null,
                id_card_back: dto.id_card_back || null,
                driver_license_front: dto.driver_license_front || '',
                driver_license_back: dto.driver_license_back || '',
                is_online: false,
                wallet_balance: 0,
                current_location: 'POINT(10.776111 106.701111)',
            });
            await this.profileRepo.save(profile);
        }

        if (dto.role === UserRole.CUSTOMER) {
            const latitude = dto.latitude || 10.776111;
            const longitude = dto.longitude || 106.701111;

            const servicePoint = this.serviceRepo.create({
                owner: savedUser,
                name: dto.full_name,
                address: dto.address || 'Chưa cập nhật...',
                reward_amount: dto.reward_amount !== undefined ? Number(dto.reward_amount) : 50000,
                discount: dto.discount !== undefined ? Number(dto.discount) : 0,
                advertising_budget: 0,
                geofence_radius: dto.geofence_radius !== undefined ? Number(dto.geofence_radius) : 100,
                location: `POINT(${latitude} ${longitude})`,
                province: dto.province,
            });
            await this.serviceRepo.save(servicePoint);
        }

        // Create Bank Account if provided
        if (dto.bank_name || dto.account_number || dto.account_holder_name) {
            const bankAccount = this.bankRepo.create({
                user: savedUser,
                bank_name: dto.bank_name || '',
                account_number: dto.account_number || '',
                account_holder_name: dto.account_holder_name || '',
            });
            await this.bankRepo.save(bankAccount);
        }

        return { message: 'Tạo tài khoản thành công', userId: savedUser.id };
    }

    async updateUser(id: string, dto: UpdateUserDto) {
        const user = await this.userRepo.findOne({
            where: { id },
            relations: ['partnerProfile', 'servicePoints', 'bankAccount']
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
            const profileUpdates: any = {};

            if (dto.vehicle_plate) profileUpdates.vehicle_plate = dto.vehicle_plate;
            if (dto.brand) profileUpdates.brand = dto.brand;
            if (dto.driver_license_front) profileUpdates.driver_license_front = dto.driver_license_front;
            if (dto.driver_license_back) profileUpdates.driver_license_back = dto.driver_license_back;
            if (dto.id_card_front) profileUpdates.id_card_front = dto.id_card_front;
            if (dto.id_card_back) profileUpdates.id_card_back = dto.id_card_back;

            if (Object.keys(profileUpdates).length > 0) {
                await this.profileRepo.update(profile.id, profileUpdates);
            }
        }

        // Update Service Point (Customer)
        if (user.role === UserRole.CUSTOMER && user.servicePoints && user.servicePoints.length > 0) {
            // Update the primary service point (first one)
            const servicePoint = user.servicePoints[0];
            if (dto.address) servicePoint.address = dto.address;
            if (dto.province) servicePoint.province = dto.province;
            if (dto.reward_amount !== undefined) servicePoint.reward_amount = dto.reward_amount;
            if (dto.discount !== undefined) servicePoint.discount = Number(dto.discount);
            if (dto.advertising_budget !== undefined) servicePoint.advertising_budget = dto.advertising_budget;
            if (dto.geofence_radius !== undefined) servicePoint.geofence_radius = dto.geofence_radius;
            if (dto.latitude && dto.longitude) {
                servicePoint.location = `POINT(${dto.latitude} ${dto.longitude})`;
            }

            await this.serviceRepo.save(servicePoint);
        }

        // Update Bank Account
        if (dto.bank_name || dto.account_number || dto.account_holder_name) {
            let bankAccount = user.bankAccount;
            if (!bankAccount) {
                bankAccount = this.bankRepo.create({ user });
            }

            if (dto.bank_name) bankAccount.bank_name = dto.bank_name;
            if (dto.account_number) bankAccount.account_number = dto.account_number;
            if (dto.account_holder_name) bankAccount.account_holder_name = dto.account_holder_name;

            await this.bankRepo.save(bankAccount);
        }

        return { message: 'Cập nhật thông tin thành công' };
    }

    async getPartnerStats(range: string, page: number = 1, limit: number = 10) {
        const query = this.tripRepo.createQueryBuilder('trip')
            .leftJoinAndSelect('trip.partner', 'partner')
            .leftJoinAndSelect('partner.bankAccount', 'bankAccount')
            .where('trip.status NOT IN (:...statuses)', { statuses: [TripStatus.PENDING_CONFIRMATION, TripStatus.REJECTED] })
            .select([
                'partner.id',
                'partner.full_name',
                'bankAccount.bank_name',
                'bankAccount.account_number',
                'bankAccount.account_holder_name',
                'COUNT(trip.trip_id) as totalTrips',
                'SUM(trip.actual_guest_count) as totalGuests',
                'SUM(trip.reward_snapshot) as totalPoints'
            ])
            .groupBy('partner.id')
            .addGroupBy('partner.full_name')
            .addGroupBy('bankAccount.bank_name')
            .addGroupBy('bankAccount.account_number')
            .addGroupBy('bankAccount.account_holder_name')
            .leftJoin('trip.servicePoint', 'servicePoint')
            .addSelect('SUM(trip.reward_snapshot - (trip.reward_snapshot * COALESCE(servicePoint.discount, 0) / 100))', 'totalDiscounted');

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

        const totalQuery = query.clone();
        totalQuery.limit(undefined);
        totalQuery.offset(undefined);
        const total = (await totalQuery.getRawMany()).length;

        if (limit > 0) {
            query.skip((page - 1) * limit);
            query.take(limit);
        }

        const stats = await query.getRawMany();

        const data = stats.map(stat => ({
            partnerId: stat.partner_id,
            partnerName: stat.partner_full_name,
            totalTrips: Number(stat.totalTrips),
            totalGuests: Number(stat.totalGuests) || 0,
            totalPoints: Number(stat.totalPoints) || 0,
            totalDiscounted: Number(stat.totalDiscounted) || 0,
            bankName: stat.bankAccount_bank_name || '',
            accountNumber: stat.bankAccount_account_number || '',
            accountHolderName: stat.bankAccount_account_holder_name || '',
        }));

        return { data, total };
    }

    async getServicePointStats(range: string, page: number = 1, limit: number = 10) {
        const query = this.tripRepo.createQueryBuilder('trip')
            .leftJoinAndSelect('trip.servicePoint', 'servicePoint')
            .leftJoinAndSelect('servicePoint.owner', 'owner')
            .leftJoinAndSelect('owner.bankAccount', 'bankAccount')
            .select([
                'servicePoint.id',
                'servicePoint.name',
                'bankAccount.bank_name',
                'bankAccount.account_number',
                'bankAccount.account_holder_name',
                'COUNT(trip.trip_id) as totalTrips',
                'SUM(trip.actual_guest_count) as totalGuests',
                `SUM(CASE WHEN trip.status != '${TripStatus.REJECTED}' THEN trip.reward_snapshot ELSE 0 END) as totalPoints`
            ])
            .groupBy('servicePoint.id')
            .addGroupBy('servicePoint.name')
            .addGroupBy('bankAccount.bank_name')
            .addGroupBy('bankAccount.account_number')
            .addGroupBy('bankAccount.account_holder_name');

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

        const totalQuery = query.clone();
        totalQuery.limit(undefined);
        totalQuery.offset(undefined);
        const total = (await totalQuery.getRawMany()).length;

        if (limit > 0) {
            query.skip((page - 1) * limit);
            query.take(limit);
        }

        const stats = await query.getRawMany();

        const data = stats.map(stat => ({
            servicePointId: stat.servicePoint_id,
            servicePointName: stat.servicePoint_name,
            totalTrips: Number(stat.totalTrips),
            totalGuests: Number(stat.totalGuests) || 0,
            totalCost: Number(stat.totalPoints) || 0,
            bankName: stat.bankAccount_bank_name || '',
            accountNumber: stat.bankAccount_account_number || '',
            accountHolderName: stat.bankAccount_account_holder_name || '',
        }));

        return { data, total };
    }


    async changeUserPassword(userId: string, newPassword: string) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password_hash = hashedPassword;
        await this.userRepo.save(user);

        return { message: 'Password changed successfully' };
    }

    async getUserTrips(userId: string, page: number = 1, limit: number = 10) {
        const query = this.tripRepo.createQueryBuilder('trip')
            .leftJoinAndSelect('trip.partner', 'partner')
            .leftJoinAndSelect('trip.servicePoint', 'servicePoint')
            .leftJoinAndSelect('servicePoint.owner', 'owner')
            .where('partner.id = :userId OR owner.id = :userId', { userId })
            .orderBy('trip.created_at', 'DESC');

        if (limit > 0) {
            query.skip((page - 1) * limit);
            query.take(limit);
        }

        const [trips, total] = await query.getManyAndCount();

        return {
            data: trips,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
}