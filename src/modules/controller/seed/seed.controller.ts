import { Controller, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Raw } from 'typeorm';

import * as bcrypt from 'bcrypt';
import { User } from '../../../entities/user.entity';
import { PartnerProfile } from '../../../entities/partner-profile.entity';
import { ServicePoint } from '../../../entities/service-point.entity';
import { Trip } from '../../../entities/trip.entity';
import { UserRole } from 'src/utils/user-role.enum';
import { TripStatus } from 'src/utils/trips-status-enum';
import { UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from 'src/modules/auth/guards/api-key.guard';

@Controller('seed')
@UseGuards(ApiKeyGuard)
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
            password_hash: await bcrypt.hash('Admin@12345', 10),
            full_name: 'Admin System',
            role: UserRole.ADMIN,
        });
        await this.userRepo.save(admin);

        return { message: 'Đã tạo xong dữ liệu giả! Hãy kiểm tra Database.' };
    }
}