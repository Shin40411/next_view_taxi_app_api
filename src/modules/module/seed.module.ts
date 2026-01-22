
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from '../../entities/user.entity';
import { PartnerProfile } from '../../entities/partner-profile.entity';
import { ServicePoint } from '../../entities/service-point.entity';
import { Trip } from '../../entities/trip.entity';
import { SeedController } from '../controller/seed/seed.controller';
import { AuthModule } from './auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            User,
            PartnerProfile,
            ServicePoint,
            Trip
        ]),
        AuthModule,
        ConfigModule,
    ],
    controllers: [SeedController],
})
export class SeedModule { }
