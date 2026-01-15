import { Controller, Get, Query, Param, Request, Post, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthGuard } from 'src/modules/auth/guards/auth.guard';
import { CustomerService } from 'src/modules/services/customers/customer.service';
import { WalletService } from 'src/modules/services/wallet/wallet.service';
import { CreateDepositDto, CreateTransferDto } from 'src/modules/dtos/wallet.dto';

@Controller('customer')
@UseGuards(AuthGuard)
export class CustomerController {
    constructor(
        private readonly customerService: CustomerService,
        private readonly walletService: WalletService
    ) { }

    @Post('wallet/deposit')
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
        if (body.amount) {
            body.amount = Number(body.amount);
        }
        return this.walletService.requestDeposit(req.user.sub, body);
    }

    @Post('wallet/transfer')
    async transfer(@Request() req, @Body() body: CreateTransferDto) {
        return this.walletService.transfer(req.user.sub, body);
    }

    @Get('pending-requests')
    async getPendingRequests(@Request() req, @Query('page') page: number = 1, @Query('limit') limit: number = 5) {
        return this.customerService.getPendingTrips(req.user.sub, Number(page), Number(limit));
    }

    @Get('arrived-requests')
    async getArrivedRequests(@Request() req, @Query('page') page: number = 1, @Query('limit') limit: number = 5) {
        return this.customerService.getArrivedTrips(req.user.sub, Number(page), Number(limit));
    }

    @Get('completed-requests')
    async getCompletedRequests(@Request() req, @Query('page') page: number = 1, @Query('limit') limit: number = 5) {
        return this.customerService.getCompletedTrips(req.user.sub, Number(page), Number(limit));
    }

    @Get('rejected-requests')
    async getRejectedRequests(@Request() req, @Query('page') page: number = 1, @Query('limit') limit: number = 5) {
        return this.customerService.getRejectedTrips(req.user.sub, Number(page), Number(limit));
    }

    @Get('cancelled-requests')
    async getCancelledRequests(@Request() req, @Query('page') page: number = 1, @Query('limit') limit: number = 5) {
        return this.customerService.getCancelledTrips(req.user.sub, Number(page), Number(limit));
    }

    @Get('all-requests')
    async getAllRequests(@Request() req, @Query('page') page: number = 1, @Query('limit') limit: number = 5) {
        return this.customerService.getAllTrips(req.user.sub, Number(page), Number(limit));
    }

    @Post('confirm-request/:tripId')
    async confirmRequest(@Request() req, @Param('tripId') tripId: string, @Body('actualGuestCount') actualGuestCount: number) {
        return this.customerService.confirmTrip(req.user.sub, tripId, actualGuestCount);
    }

    @Post('reject-request/:tripId')
    async rejectRequest(
        @Request() req,
        @Param('tripId') tripId: string,
        @Body('actualGuestCount') actualGuestCount: number,
        @Body('reason') reason: string
    ) {
        return this.customerService.rejectTrip(req.user.sub, tripId, actualGuestCount, reason);
    }
    @Get('stats/budget')
    @UseGuards(AuthGuard)
    async getBudgetStats(@Request() req, @Query('range') range: string) {
        return this.customerService.getBudgetStatistics(req.user.sub, range);
    }

    @Get('active-drivers')
    async getActiveDrivers() {
        return this.customerService.getActiveDrivers();
    }
}