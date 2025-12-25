import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { CreateUserDto } from 'src/modules/dtos';
import { UserRole } from 'src/utils/user-role.enum';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { AdminService } from 'src/modules/services/admin/admin.service';

@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('users')
    async getUsers(
        @Query('role') role: UserRole,
        @Query('page') page: number,
        @Query('limit') limit: number,
    ) {
        return this.adminService.getUsers(role, Number(page) || 1, Number(limit) || 10);
    }

    @Get('users/:id')
    async getUser(@Param('id') id: string) {
        return this.adminService.getUserById(id);
    }

    @Post('users')
    async createUser(@Body() body: CreateUserDto) {
        return this.adminService.createUser(body);
    }
}