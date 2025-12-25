import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerProfile } from 'src/entities/partner-profile.entity';
import { Trip, TripStatus } from 'src/entities/trip.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TripsService {
    constructor(
        @InjectRepository(Trip) private tripRepo: Repository<Trip>,
        @InjectRepository(PartnerProfile) private profileRepo: Repository<PartnerProfile>,
    ) { }
}