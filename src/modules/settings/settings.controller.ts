import { Controller, Get, Put, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Setting } from '../../entities/setting.entity';
import { AuthGuard } from '../auth/auth.guard';
import { UserRole } from '../../utils/user-role.enum';
import { UpdateSettingsDto } from '../dtos/update-settings.dto';

@Controller('settings')
@UseGuards(AuthGuard)
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get()
    async getSettings(@Request() req): Promise<Setting> {
        if (req.user.role !== UserRole.ADMIN) throw new ForbiddenException('Admin access required');
        return this.settingsService.getSettings();
    }



    @Put()
    async updateSettings(@Request() req, @Body() data: UpdateSettingsDto): Promise<Setting> {
        if (req.user.role !== UserRole.ADMIN) throw new ForbiddenException('Admin access required');
        return this.settingsService.updateSettings(data);
    }
}
