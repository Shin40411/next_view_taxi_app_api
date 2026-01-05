import { Controller, Get, Post, Body, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { WalletService } from 'src/modules/services/wallet/wallet.service';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { UserRole } from 'src/utils/user-role.enum';

@Controller('admin/wallets')
@UseGuards(AuthGuard)
export class WalletController {
    constructor(private readonly walletService: WalletService) { }

    @Get()
    async findAll(
        @Request() req,
        @Query('page') page: number,
        @Query('limit') limit: number,
        @Query('search') search: string
    ) {
        if (req.user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only admin can view wallets');
        }
        return this.walletService.findAll(Number(page) || 1, Number(limit) || 10, search);
    }

    @Post('deposit')
    async deposit(@Request() req, @Body() body: { servicePointId: string; amountVnd: number }) {
        if (req.user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only admin can perform deposits');
        }
        return this.walletService.deposit(body.servicePointId, body.amountVnd);
    }
}
