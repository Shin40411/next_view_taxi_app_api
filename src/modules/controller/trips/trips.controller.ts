import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { TripsService } from 'src/modules/services/trips/trips.service';
import { AuthGuard } from 'src/modules/auth/auth.guard';

@Controller('trips')
@UseGuards(AuthGuard)
export class TripsController {
    constructor(private readonly tripsService: TripsService) { }
}