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

    @Post('confirm-request/:tripId')
    async confirmRequest(@Request() req, @Param('tripId') tripId: string) {
        return this.customerService.confirmTrip(req.user.sub, tripId);
    }

    @Post('reject-request/:tripId')
    async rejectRequest(
        @Request() req,
        @Param('tripId') tripId: string,
        @Body('actualGuestCount') actualGuestCount: number
    ) {
        return this.customerService.rejectTrip(req.user.sub, tripId, actualGuestCount);
    }
}