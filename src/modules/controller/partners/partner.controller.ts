import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { PartnerService } from 'src/modules/services/partners/partner.service';
import { AuthGuard } from 'src/modules/auth/auth.guard';

@Controller('partner')
@UseGuards(AuthGuard)
export class PartnerController {
    constructor(private readonly partnerService: PartnerService) { }

    @Get('stats')
    async getStats(
        @Request() req,
        @Query('range') range: 'today' | 'yesterday' | 'week' | 'month' = 'today'
    ) {
        return this.partnerService.getStatistics(req.user.sub, range);
    }

    @Get('home')
    async getHomeStats(@Request() req) {
        return this.partnerService.getHomeStats(req.user.sub);
    }

    @Post('create-request')
    async createTripRequest(
        @Request() req,
        @Body() body: { servicePointId: string; guestCount: number }
    ) {
        return this.partnerService.createTripRequest(req.user.sub, body.servicePointId, body.guestCount);
    }

    @Post('confirm-arrival/:tripId')
    async confirmArrival(
        @Request() req,
        @Param('tripId') tripId: string
    ) {
        return this.partnerService.confirmArrival(req.user.sub, tripId);
    }

    @Post('cancel-request/:tripId')
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
    async getMyRequests(@Request() req) {
        return this.partnerService.getMyTripRequests(req.user.sub);
    }
}