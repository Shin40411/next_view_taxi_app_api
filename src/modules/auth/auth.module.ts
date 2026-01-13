import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthGuard } from './auth.guard';
import { User } from 'src/entities/user.entity';
import { PartnerProfile } from 'src/entities/partner-profile.entity';
import { ServicePoint } from 'src/entities/service-point.entity';
import { AuthService } from '../services/auth/auth.service';
import { ZaloService } from '../services/zalo/zalo.service';
import { AuthController } from '../controller/auth/auth.controller';
import { RedisModule } from '../redis/redis.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { SettingsModule } from '../settings/settings.module';
import { MailService } from '../services/mail/mail.service';
import { SettingsService } from '../services/settings/settings.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, PartnerProfile, ServicePoint]),
        ConfigModule,
        RedisModule,
        forwardRef(() => SettingsModule),
    ],
    providers: [
        AuthService,
        AuthGuard,
        ZaloService,
        MailService,
        {
            provide: 'GOOGLE_STRATEGY',
            useFactory: async (settingsService: SettingsService) => {
                const settings = await settingsService.getSettings();
                return new GoogleStrategy(settings);
            },
            inject: [SettingsService],
        }
    ],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule { }