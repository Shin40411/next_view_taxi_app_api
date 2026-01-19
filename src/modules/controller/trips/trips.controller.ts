import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { TripsService } from 'src/modules/services/trips/trips.service';
import { AuthGuard } from 'src/modules/auth/guards/auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SafeThrottlerGuard } from 'src/common/guards/safe-throttler.guard';

@Controller('trips')
@UseGuards(AuthGuard, SafeThrottlerGuard)
export class TripsController {
    constructor(private readonly tripsService: TripsService) { }
}