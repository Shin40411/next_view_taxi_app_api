import { Controller, Get, Post, Put, Body, Query, Param, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CreateUserDto, UpdateUserDto } from 'src/modules/dtos';
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

    @Put('users/:id')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'id_card_front', maxCount: 1 },
        { name: 'id_card_back', maxCount: 1 },
        { name: 'driver_license_front', maxCount: 1 },
        { name: 'driver_license_back', maxCount: 1 },
    ], {
        storage: diskStorage({
            destination: (req, file, cb) => {
                if (file.fieldname.startsWith('driver_license')) {
                    cb(null, './uploads/driver_license');
                } else {
                    cb(null, './uploads/partners');
                }
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const ext = extname(file.originalname);
                cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
            },
        }),
    }))
    async updateUser(
        @Param('id') id: string,
        @Body() body: UpdateUserDto,
        @UploadedFiles() files: {
            id_card_front?: Express.Multer.File[],
            id_card_back?: Express.Multer.File[],
            driver_license_front?: Express.Multer.File[],
            driver_license_back?: Express.Multer.File[]
        }
    ) {
        if (files?.id_card_front?.[0]) body.id_card_front = files.id_card_front[0].path;
        if (files?.id_card_back?.[0]) body.id_card_back = files.id_card_back[0].path;
        if (files?.driver_license_front?.[0]) body.driver_license_front = files.driver_license_front[0].path;
        if (files?.driver_license_back?.[0]) body.driver_license_back = files.driver_license_back[0].path;

        return this.adminService.updateUser(id, body);
    }

    @Get('stats/partners')
    async getPartnerStats(@Query('range') range: string) {
        return this.adminService.getPartnerStats(range);
    }

    @Get('stats/customers')
    async getServicePointStats(@Query('range') range: string) {
        return this.adminService.getServicePointStats(range);
    }
}