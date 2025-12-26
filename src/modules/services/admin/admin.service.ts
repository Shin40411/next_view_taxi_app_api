import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto } from 'src/modules/dtos';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerProfile } from 'src/entities/partner-profile.entity';
import { ServicePoint } from 'src/entities/service-point.entity';
import { Trip, TripStatus } from 'src/entities/trip.entity';
import { User } from 'src/entities/user.entity';
import { UserRole } from 'src/utils/user-role.enum';
import { Repository, Raw } from 'typeorm';

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
        if (dto.role === UserRole.PARTNER) {
            const profile = this.profileRepo.create({
                user: savedUser,
                vehicle_plate: dto.vehicle_plate || 'Updating...',
                id_card_front: dto.id_card_front,
                id_card_back: dto.id_card_back,
                is_online: false,
                wallet_balance: 0,
                // Default location (e.g., center of HCMC)
                current_location: Raw(() => "ST_GeomFromText('POINT(10.776111 106.701111)', 4326)") as any,
            });
            await this.profileRepo.save(profile);
        }

        // If creating a CUSTOMER, create a default service point
        if (dto.role === UserRole.CUSTOMER) {
            const servicePoint = this.serviceRepo.create({
                owner: savedUser,
                name: dto.full_name,
                address: dto.address || 'Updating...',
                reward_amount: 50000,
                advertising_budget: 0,
                geofence_radius: 100,
                location: 'POINT(10.776111 106.701111)',
            });
            await this.serviceRepo.save(servicePoint);
        }

        return { message: 'User created successfully', userId: savedUser.id };
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

        // Update Partner Profile
        if (user.role === UserRole.PARTNER && user.partnerProfile) {
            const profile = user.partnerProfile;
            if (dto.vehicle_plate) profile.vehicle_plate = dto.vehicle_plate;
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
}