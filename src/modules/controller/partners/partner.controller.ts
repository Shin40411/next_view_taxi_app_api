import { Body, Controller, Get, Param, Post, Query, Request, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PartnerService } from 'src/modules/services/partners/partner.service';
import { WalletService } from 'src/modules/services/wallet/wallet.service';
import { AuthGuard } from 'src/modules/auth/guards/auth.guard';
import { CreateWithdrawDto, CreateTransferDto, CreateDepositDto } from 'src/modules/dtos/wallet.dto';
import { Throttle } from '@nestjs/throttler';
import { SafeThrottlerGuard } from 'src/common/guards/safe-throttler.guard';

@Controller('partner')
@UseGuards(AuthGuard, SafeThrottlerGuard)
export class PartnerController {
    constructor(
        private readonly partnerService: PartnerService,
        private readonly walletService: WalletService
    ) { }

    @Post('wallet/withdraw')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async requestWithdraw(@Request() req, @Body() body: CreateWithdrawDto) {
        return this.walletService.requestWithdraw(req.user.sub, body);
    }

    @Post('wallet/deposit')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @UseInterceptors(FileInterceptor('bill', {
        storage: diskStorage({
            destination: './uploads/bills',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const ext = extname(file.originalname);
                cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
            },
        }),
        limits: { fileSize: 5 * 1024 * 1024 },
    }))
    async requestDeposit(@Request() req, @Body() body: CreateDepositDto, @UploadedFile() file: Express.Multer.File) {
        if (file) {
            body.bill = file.path;
        }

        if (body.amount === undefined && req.body.amount) {
            body.amount = Number(req.body.amount);
        } else if (body.amount) {
            body.amount = Number(body.amount);
        }

        return this.walletService.requestDeposit(req.user.sub, body);
    }

    @Post('wallet/transfer')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async transfer(@Request() req, @Body() body: CreateTransferDto) {
        return this.walletService.transfer(req.user.sub, body);
    }

    @Get('stats')
    async getStats(
        @Request() req,
        @Query('range') range: 'today' | 'yesterday' | 'week' | 'month' = 'today'
    ) {
        return this.partnerService.getStatistics(req.user.sub, range);
    }
    // ...

    @Get('home')
    async getHomeStats(@Request() req) {
        return this.partnerService.getHomeStats(req.user.sub);
    }

    @Post('create-request')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async createTripRequest(
        @Request() req,
        @Body() body: { servicePointId: string; guestCount: number }
    ) {
        return this.partnerService.createTripRequest(req.user.sub, body.servicePointId, body.guestCount);
    }

    @Post('confirm-arrival/:tripId')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async confirmArrival(
        @Request() req,
        @Param('tripId') tripId: string
    ) {
        return this.partnerService.confirmArrival(req.user.sub, tripId);
    }

    @Post('cancel-request/:tripId')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async cancelRequest(
        @Request() req,
        @Param('tripId') tripId: string,
        @Body('reason') reason: string
    ) {
        return this.partnerService.cancelTrip(req.user.sub, tripId, reason);
    }

    @Get('search-destination')
    async searchDestination(@Query('keyword') keyword: string) {
        return this.partnerService.searchServicePoints(keyword);
    }

    @Get('my-requests')
    async getMyRequests(
        @Request() req,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 5
    ) {
        return this.partnerService.getMyTripRequests(req.user.sub, Number(page), Number(limit));
    }
}