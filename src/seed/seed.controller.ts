import { Controller, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Raw } from 'typeorm';

import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { PartnerProfile } from '../entities/partner-profile.entity';
import { ServicePoint } from '../entities/service-point.entity';
import { Trip } from '../entities/trip.entity';
import { UserRole } from 'src/utils/user-role.enum';
import { TripStatus } from 'src/utils/trips-status-enum';

@Controller('seed')
export class SeedController {
    constructor(
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(PartnerProfile) private profileRepo: Repository<PartnerProfile>,
        @InjectRepository(ServicePoint) private serviceRepo: Repository<ServicePoint>,
        @InjectRepository(Trip) private tripRepo: Repository<Trip>,
    ) { }

    @Post('init')
    async generateFakeData() {
        const admin = this.userRepo.create({
            username: 'admin',
            password_hash: await bcrypt.hash('123456', 10),
            full_name: 'Admin System',
            role: UserRole.ADMIN,
        });
        await this.userRepo.save(admin);

        const partnerUser = this.userRepo.create({
            username: 'driver01',
            password_hash: await bcrypt.hash('123456', 10),
            full_name: 'Nguyen Van Tai Xe',
            role: UserRole.PARTNER,
        });
        await this.userRepo.save(partnerUser);

        const partnerProfile = this.profileRepo.create({
            user: partnerUser,
            vehicle_plate: '59-X1 123.45',
            is_online: true,
            wallet_balance: 0,
            current_location: Raw(() => "ST_GeomFromText('POINT(10.776111 106.701111)', 4326)") as any,
        });
        await this.profileRepo.save(partnerProfile);
        const restaurant = this.serviceRepo.create({
            name: 'Pho Thin 13 Lo Duc',
            address: 'Quan 1, TP.HCM',
            geofence_radius: 100,
            reward_amount: 50000,
            location: Raw(() => "ST_GeomFromText('POINT(10.772000 106.698000)', 4326)") as any,
        });
        await this.serviceRepo.save(restaurant);

        const trip = this.tripRepo.create({
            partner: partnerUser,
            servicePoint: restaurant,
            status: TripStatus.PENDING_CONFIRMATION,
        });
        await this.tripRepo.save(trip);

        return { message: 'Đã tạo xong dữ liệu giả! Hãy kiểm tra Database.' };
    }
}