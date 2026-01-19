import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, UseInterceptors, UploadedFiles, Request } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CreateUserDto, UpdateUserDto, AdminChangePasswordDto, UpdatePartnerStatusDto } from 'src/modules/dtos/register-user.dto';
import { UpdateTransactionStatusDto } from 'src/modules/dtos/wallet.dto';
import { UserRole } from 'src/utils/user-role.enum';
import { AuthGuard } from 'src/modules/auth/guards/auth.guard';
import { ApiKeyGuard } from 'src/modules/auth/guards/api-key.guard';
import { AdminService } from 'src/modules/services/admin/admin.service';
import { CreateAdminDto, UpdateAdminDto } from 'src/modules/dtos/admin-user.dto';
import { WalletService } from 'src/modules/services/wallet/wallet.service';
import { TransactionStatus } from 'src/utils/wallet-transaction-enum';
import { Throttle } from '@nestjs/throttler';
import { SafeThrottlerGuard } from 'src/common/guards/safe-throttler.guard';

@Controller('admin')
@UseGuards(AuthGuard, SafeThrottlerGuard)
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly walletService: WalletService
    ) { }
    @Put('wallet-transactions/status')
    async updateTransactionStatus(@Request() req, @Body() body: UpdateTransactionStatusDto) {
        return this.walletService.updateTransactionStatus(body.transactionId, body.accept, req.user.sub, body.reason);
    }

    @Get('users')
    async getUsers(
        @Query('role') role: UserRole,
        @Query('page') page: number,
        @Query('limit') limit: number,
        @Query('search') search?: string,
        @Query('province') province?: string,
    ) {
        return this.adminService.getUsers(role, Number(page) || 1, Number(limit) || 10, search, province);
    }

    @Get('users/:id')
    async getUser(@Param('id') id: string, @Request() req) {
        const user = await this.adminService.getUserById(id);

        if (req.user.role !== 'ADMIN' && req.user.role !== 'MONITOR' && user.servicePoints) {
            user.servicePoints.forEach(sp => {
                delete (sp as any).discount;
            });
        }
        return user;
    }

    @Post('users')
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'id_card_front', maxCount: 1 },
        { name: 'id_card_back', maxCount: 1 },
        { name: 'driver_license_front', maxCount: 1 },
        { name: 'driver_license_back', maxCount: 1 },
        { name: 'contract', maxCount: 1 },
        { name: 'avatar', maxCount: 1 },
    ], {
        storage: diskStorage({
            destination: (req, file, cb) => {
                if (file.fieldname.startsWith('driver_license')) {
                    cb(null, './uploads/driver_license');
                } else if (file.fieldname === 'contract') {
                    cb(null, './uploads/contracts');
                } else if (file.fieldname === 'avatar') {
                    cb(null, './uploads/avatars');
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
        fileFilter: (req, file, cb) => {
            if (file.fieldname === 'contract') {
                if (!file.originalname.match(/\.(pdf|doc|docx|jpg|jpeg|png|gif|webp|jfif)$/i)) {
                    return cb(new Error('Chỉ chấp nhận file PDF, DOC, DOCX, JPG, JPEG, PNG, GIF, WEBP, JFIF!'), false);
                }
            } else {
                if (!file.originalname.match(/\.(pdf|jpg|jpeg|png|gif|webp|jfif)$/i)) {
                    return cb(new Error('Chỉ chấp nhận file PDF, JPG, JPEG, PNG, GIF, WEBP, JFIF!'), false);
                }
            }
            cb(null, true);
        },
        limits: { fileSize: 5 * 1024 * 1024 },
    }))
    async createUser(
        @Body() body: CreateUserDto,
        @UploadedFiles() files: {
            id_card_front?: Express.Multer.File[],
            id_card_back?: Express.Multer.File[],
            driver_license_front?: Express.Multer.File[],
            driver_license_back?: Express.Multer.File[],
            contract?: Express.Multer.File[],
            avatar?: Express.Multer.File[]
        }
    ) {
        if (files?.id_card_front?.[0]) body.id_card_front = files.id_card_front[0].path;
        if (files?.id_card_back?.[0]) body.id_card_back = files.id_card_back[0].path;
        if (files?.driver_license_front?.[0]) body.driver_license_front = files.driver_license_front[0].path;
        if (files?.driver_license_back?.[0]) body.driver_license_back = files.driver_license_back[0].path;
        if (files?.contract?.[0]) body.contract = files.contract[0].path;
        if (files?.avatar?.[0]) body.avatar = files.avatar[0].path;

        return this.adminService.createUser(body);
    }

    @Put('users/:id')
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'id_card_front', maxCount: 1 },
        { name: 'id_card_back', maxCount: 1 },
        { name: 'driver_license_front', maxCount: 1 },
        { name: 'driver_license_back', maxCount: 1 },
        { name: 'contract', maxCount: 1 },
        { name: 'avatar', maxCount: 1 },
    ], {
        storage: diskStorage({
            destination: (req, file, cb) => {
                if (file.fieldname.startsWith('driver_license')) {
                    cb(null, './uploads/driver_license');
                } else if (file.fieldname === 'contract') {
                    cb(null, './uploads/contracts');
                } else if (file.fieldname === 'avatar') {
                    cb(null, './uploads/avatars');
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
        fileFilter: (req, file, cb) => {
            if (!file.originalname.match(/\.(pdf|jpg|jpeg|png|gif|webp|jfif)$/i)) {
                return cb(new Error('Chỉ chấp nhận file PDF, JPG, JPEG, PNG, GIF, WEBP, JFIF!'), false);
            }
            cb(null, true);
        },
        limits: { fileSize: 5 * 1024 * 1024 },
    }))
    async updateUser(
        @Param('id') id: string,
        @Body() body: UpdateUserDto,
        @UploadedFiles() files: {
            id_card_front?: Express.Multer.File[],
            id_card_back?: Express.Multer.File[],
            driver_license_front?: Express.Multer.File[],
            driver_license_back?: Express.Multer.File[],
            contract?: Express.Multer.File[],
            avatar?: Express.Multer.File[]
        }
    ) {
        if (files?.id_card_front?.[0]) body.id_card_front = files.id_card_front[0].path;
        if (files?.id_card_back?.[0]) body.id_card_back = files.id_card_back[0].path;
        if (files?.driver_license_front?.[0]) body.driver_license_front = files.driver_license_front[0].path;
        if (files?.driver_license_back?.[0]) body.driver_license_back = files.driver_license_back[0].path;
        if (files?.contract?.[0]) body.contract = files.contract[0].path;
        if (files?.avatar?.[0]) body.avatar = files.avatar[0].path;

        return this.adminService.updateUser(id, body);
    }

    @Delete('users/:id')
    async deleteUser(@Param('id') id: string) {
        return this.adminService.deleteUser(id);
    }

    @Delete('users/:id/permanent')
    async deleteUserPermanent(@Param('id') id: string) {
        return this.adminService.hardDeleteUser(id);
    }

    @Get('users/deleted/list')
    async getDeletedUsers(
        @Query('page') page: number,
        @Query('limit') limit: number,
        @Query('search') search?: string,
    ) {
        return this.adminService.getDeletedUsers(Number(page) || 1, Number(limit) || 10, search);
    }

    @Post('users/:id/restore')
    async restoreUser(@Param('id') id: string) {
        return this.adminService.restoreUser(id);
    }

    @Get('stats/partners')
    async getPartnerStats(
        @Query('range') range: string,
        @Query('page') page: number,
        @Query('limit') limit: number
    ) {
        return this.adminService.getPartnerStats(range, Number(page) || 1, Number(limit) || 10);
    }

    @Get('stats/customers')
    async getServicePointStats(
        @Query('range') range: string,
        @Query('page') page: number,
        @Query('limit') limit: number
    ) {
        return this.adminService.getServicePointStats(range, Number(page) || 1, Number(limit) || 10);
    }

    @Post('users/change-password')
    async changePassword(@Body() body: AdminChangePasswordDto) {
        return this.adminService.changeUserPassword(body.userId, body.newPassword);
    }

    @Put('users/:id/partner-status')
    async updatePartnerStatus(
        @Param('id') id: string,
        @Body() body: UpdatePartnerStatusDto
    ) {
        return this.adminService.updatePartnerStatus(id, body.status, body.reason);
    }

    @Get('users/:id/trips')
    async getUserTrips(
        @Param('id') id: string,
        @Query('page') page: number,
        @Query('limit') limit: number,
    ) {
        return this.adminService.getUserTrips(id, Number(page) || 1, Number(limit) || 10);
    }
}