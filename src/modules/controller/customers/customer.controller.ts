import { Controller, Get, Query, Param, Request, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { CustomerService } from 'src/modules/services/customers/customer.service';

@Controller('customer')
@UseGuards(AuthGuard)
export class CustomerController {
    constructor(private readonly customerService: CustomerService) { }

    @Get('pending-requests')
    async getPendingRequests(@Request() req) {
        return this.customerService.getPendingTrips(req.user.sub);
    }

    @Get('completed-requests')
    async getCompletedRequests(@Request() req) {
        return this.customerService.getCompletedTrips(req.user.sub);
    }

    @Get('rejected-requests')
    async getRejectedRequests(@Request() req) {
        return this.customerService.getRejectedTrips(req.user.sub);
    }

    @Post('confirm-request/:tripId')
    async confirmRequest(@Request() req, @Param('tripId') tripId: string) {
        return this.customerService.confirmTrip(req.user.sub, tripId);
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
}