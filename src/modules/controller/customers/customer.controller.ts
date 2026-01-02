import { Controller, Get, Query, Param, Request, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { CustomerService } from 'src/modules/services/customers/customer.service';

@Controller('customer')
@UseGuards(AuthGuard)
export class CustomerController {
    constructor(private readonly customerService: CustomerService) { }

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