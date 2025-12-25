import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
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

    @Get('search-destination')
    async searchDestination(@Query('keyword') keyword: string) {
        return this.partnerService.searchServicePoints(keyword);
    }

    @Get('my-requests')
    async getMyRequests(@Request() req) {
        return this.partnerService.getMyTripRequests(req.user.sub);
    }
}