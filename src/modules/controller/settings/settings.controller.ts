import { Controller, Get, Put, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from 'src/modules/auth/guards/auth.guard';
import { Setting } from 'src/entities/setting.entity';
import { UpdateSettingsDto } from 'src/modules/dtos/update-settings.dto';
import { SettingsService } from 'src/modules/services/settings/settings.service';
import { UserRole } from 'src/utils/user-role.enum';


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
