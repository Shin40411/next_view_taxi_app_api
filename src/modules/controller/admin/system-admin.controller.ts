import { Controller, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from 'src/modules/auth/guards/api-key.guard';
import { AdminService } from 'src/modules/services/admin/admin.service';
import { CreateAdminDto, UpdateAdminDto } from 'src/modules/dtos/admin-user.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SafeThrottlerGuard } from 'src/common/guards/safe-throttler.guard';

@Controller('admin/global')
@UseGuards(ApiKeyGuard, SafeThrottlerGuard)
export class SystemAdminController {
    constructor(private readonly adminService: AdminService) { }

    @Post('create-admin')
    async createAdminByKey(@Body() body: CreateAdminDto) {
        return this.adminService.createAdminUser(body);
    }

    @Put('update-admin/:username')
    async updateAdminByKey(@Param('username') username: string, @Body() body: UpdateAdminDto) {
        return this.adminService.updateAdminUser(username, body);
    }
}
