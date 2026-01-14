import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from '../../entities/setting.entity';
import { AuthModule } from './auth.module';
import { SettingsController } from '../controller/settings/settings.controller';
import { SettingsService } from '../services/settings/settings.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Setting]),
        forwardRef(() => AuthModule),
    ],
    controllers: [SettingsController],
    providers: [SettingsService],
    exports: [SettingsService],
})
export class SettingsModule { }
