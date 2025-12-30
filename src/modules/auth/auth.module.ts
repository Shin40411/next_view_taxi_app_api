import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthGuard } from './auth.guard';
import { User } from 'src/entities/user.entity';
import { PartnerProfile } from 'src/entities/partner-profile.entity';
import { ServicePoint } from 'src/entities/service-point.entity';
import { AuthService } from '../services/auth/auth.service';
import { ZaloService } from '../services/zalo/zalo.service';
import { AuthController } from '../controller/auth/auth.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, PartnerProfile, ServicePoint]),
        ConfigModule,
    ],
    providers: [AuthService, AuthGuard, ZaloService],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule { }