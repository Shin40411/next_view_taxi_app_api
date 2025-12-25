import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerProfile } from 'src/entities/partner-profile.entity';
import { ServicePoint } from 'src/entities/service-point.entity';
import { Trip, TripStatus } from 'src/entities/trip.entity';
import { Repository, Between, DataSource } from 'typeorm';

@Injectable()
export class PartnerService {
    constructor(
        @InjectRepository(PartnerProfile) private profileRepo: Repository<PartnerProfile>,
        @InjectRepository(Trip) private tripRepo: Repository<Trip>,
        private dataSource: DataSource,
    ) { }

    async getStatistics(partnerId: string, range: 'today' | 'yesterday' | 'week' | 'month') {
        const now = new Date();
        let start = new Date(now);
        let end = new Date(now);

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        switch (range) {
            case 'yesterday':
                start.setDate(now.getDate() - 1);
                end.setDate(now.getDate() - 1);
                break;
            case 'week':
                start.setDate(now.getDate() - 6);
                break;
            case 'month':
                start.setDate(1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'today':
            default:
                break;
        }

        const result = await this.tripRepo
            .createQueryBuilder('trip')
            .select('SUM(trip.reward_snapshot)', 'total')
            .where('trip.partner_id = :partnerId', { partnerId })
            .andWhere('trip.status = :status', { status: TripStatus.COMPLETED })
            .andWhere('trip.created_at BETWEEN :start AND :end', { start, end })
            .getRawOne();

        const count = await this.tripRepo.count({
            where: {
                partner: { id: partnerId },
                status: TripStatus.COMPLETED,
                created_at: Between(start, end)
            }
        });

        return {
            range,
            total_points: Number(result.total || 0),
            total_trips: count,
            from_date: start,
            to_date: end
        };
    }

    async getHomeStats(userId: string) {
        const profile = await this.profileRepo.findOne({
            where: { user: { id: userId } }
        });

        if (!profile) throw new NotFoundException('Partner not found');

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const tripsToday = await this.tripRepo.count({
            where: {
                partner: { id: userId },
                status: TripStatus.COMPLETED,
                created_at: Between(startOfDay, endOfDay),
            }
        });

        return {
            wallet_balance: Number(profile.wallet_balance),
            trips_today: tripsToday,
        };
    }

    async searchServicePoints(keyword: string) {
        return this.dataSource.getRepository(ServicePoint)
            .createQueryBuilder('sp')
            .select(['sp.id', 'sp.name', 'sp.address', 'sp.reward_amount', 'sp.location']) // Lấy location để map zoom vào
            .where('sp.name LIKE :keyword', { keyword: `%${keyword}%` })
            // .andWhere('sp.is_active = :active', { active: true })
            .take(10)
            .getMany();
    }

    async createTripRequest(partnerId: string, servicePointId: string, guestCount: number) {
        const pendingTrip = await this.tripRepo.findOne({
            where: {
                partner: { id: partnerId },
                status: TripStatus.PENDING_CONFIRMATION,
            },
        });

        if (pendingTrip) {
            throw new BadRequestException('Đã có một yêu cầu chờ xác nhận');
        }

        const servicePoint = await this.dataSource.getRepository(ServicePoint).findOne({ where: { id: servicePointId } });
        if (!servicePoint) throw new NotFoundException('Điểm dịch vụ không tồn tại');

        const newTrip = this.tripRepo.create({
            partner: { id: partnerId },
            servicePoint: { id: servicePointId },
            guest_count: guestCount,
            reward_snapshot: servicePoint.reward_amount,
            status: TripStatus.PENDING_CONFIRMATION,
            arrival_time: new Date()
        });

        await this.tripRepo.save(newTrip);

        return { message: 'Yêu cầu của bạn đã được gửi đi', trip_id: newTrip.trip_id };
    }

    async getMyTripRequests(partnerId: string) {
        const trips = await this.tripRepo.find({
            where: { partner: { id: partnerId } },
            relations: ['servicePoint'],
            order: { created_at: 'DESC' },
            take: 50
        });
        return trips.map(trip => ({
            id: trip.trip_id,
            service_point_name: trip.servicePoint.name,
            service_point_address: trip.servicePoint.address,
            guest_count: trip.guest_count,
            actual_guest_count: trip.actual_guest_count,
            status: trip.status,
            reward_goxu: Number(trip.reward_snapshot),
            created_at: trip.created_at,
        }));
    }
}