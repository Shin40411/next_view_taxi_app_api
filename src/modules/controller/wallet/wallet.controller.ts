import { Controller, Get, Post, Body, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { WalletService } from 'src/modules/services/wallet/wallet.service';
import { AuthGuard } from 'src/modules/auth/guards/auth.guard';
import { UserRole } from 'src/utils/user-role.enum';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SafeThrottlerGuard } from 'src/common/guards/safe-throttler.guard';

@Controller('wallets')
@UseGuards(AuthGuard, SafeThrottlerGuard)
export class WalletController {
    constructor(private readonly walletService: WalletService) { }

    @Get()
    async findAll(
        @Request() req,
        @Query('page') page: number,
        @Query('limit') limit: number,
        @Query('search') search: string,
        @Query('fromDate') fromDate: string,
        @Query('toDate') toDate: string
    ) {
        if (req.user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Bạn không có quyền để sử dụng api này');
        }
        return this.walletService.findAll(Number(page) || 1, Number(limit) || 10, search, fromDate, toDate);
    }

    @Get('banks')
    async getBanks() {
        return this.walletService.getBanks();
    }

    @Get('customer/transactions')
    async getCustomerTransactions(
        @Request() req,
        @Query('page') page: number,
        @Query('limit') limit: number,
        @Query('search') search: string,
        @Query('fromDate') fromDate: string,
        @Query('toDate') toDate: string
    ) {
        if (req.user.role !== UserRole.CUSTOMER) {
            throw new ForbiddenException('Bạn không có quyền truy cập');
        }
        return this.walletService.findByUser(req.user.sub, Number(page) || 1, Number(limit) || 10, search, fromDate, toDate);
    }

    @Get('partner/transactions')
    async getPartnerTransactions(
        @Request() req,
        @Query('page') page: number,
        @Query('limit') limit: number,
        @Query('search') search: string,
        @Query('fromDate') fromDate: string,
        @Query('toDate') toDate: string
    ) {
        if (req.user.role !== UserRole.PARTNER && req.user.role !== UserRole.INTRODUCER) {
            throw new ForbiddenException('Bạn không có quyền truy cập');
        }
        return this.walletService.findByUser(req.user.sub, Number(page) || 1, Number(limit) || 10, search, fromDate, toDate);
    }
}
