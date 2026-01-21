import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerProfile } from 'src/entities/partner-profile.entity';
import { ServicePoint } from 'src/entities/service-point.entity';
import { Trip } from 'src/entities/trip.entity';
import { TripStatus } from 'src/utils/trips-status-enum';
import { Repository, Between, DataSource, Brackets } from 'typeorm';
import { SocketGateway } from 'src/modules/socket/socket.gateway';
import { SearchServicePointDto } from '../../dtos/search-service-point.dto';
import { SettingsService } from '../settings/settings.service';
import { generateTripCode } from 'src/utils/generate-code';

@Injectable()
export class PartnerService {
    constructor(
        @InjectRepository(PartnerProfile) private profileRepo: Repository<PartnerProfile>,
        @InjectRepository(Trip) private tripRepo: Repository<Trip>,
        private dataSource: DataSource,
        private socketGateway: SocketGateway,
        private settingsService: SettingsService,
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

        const totalTrips = await this.tripRepo.count({
            where: {
                partner: { id: userId },
                status: TripStatus.COMPLETED
            }
        });

        return {
            wallet_balance: Number(profile.wallet_balance),
            trips_today: tripsToday,
            total_trips: totalTrips,
        };
    }

    async searchServicePoints(keyword: string): Promise<SearchServicePointDto[]> {
        const servicePoints = await this.dataSource.getRepository(ServicePoint)
            .createQueryBuilder('sp')
            .leftJoin('sp.owner', 'owner')
            .select(['sp.id', 'sp.name', 'sp.address', 'sp.reward_amount', 'sp.location', 'sp.discount', 'sp.advertising_budget', 'owner.avatar'])
            .where('owner.isDelete = :isDelete', { isDelete: false })
            .andWhere(new Brackets((qb) => {
                qb.where('sp.name LIKE :keyword', { keyword: `%${keyword}%` })
                    .orWhere('sp.address LIKE :keyword', { keyword: `%${keyword}%` });
            }))
            .take(10)
            .getMany();

        return servicePoints.map(sp => ({
            id: sp.id,
            name: sp.name,
            address: sp.address,
            reward_amount: sp.reward_amount,
            advertising_budget: sp.advertising_budget,
            discount: sp.discount,
            location: sp.location,
            avatar: sp.owner?.avatar || null,
        }));
    }

    async getActivePartners() {
        const partners = await this.profileRepo.find({
            where: { is_online: true },
            relations: ['user']
        });

        return partners.map(p => ({
            id: p.user.id,
            full_name: p.user.full_name,
            vehicle_plate: p.vehicle_plate,
            phone: p.user.username,
            avatarUrl: p.user.avatar,
            current_location: p.current_location
        }));
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
            trip_code: generateTripCode(servicePoint.name || 'Unknown'),
            reward_snapshot: Math.floor(((Number(servicePoint.reward_amount) || 0) * (100 - (Number(servicePoint.discount) || 0))) / 100) * guestCount,
            status: TripStatus.PENDING_CONFIRMATION,
        });

        await this.tripRepo.save(newTrip);

        const partner = await this.profileRepo.findOne({ where: { user: { id: partnerId } }, relations: ['user'] });

        const spWithOwner = await this.dataSource.getRepository(ServicePoint).findOne({
            where: { id: servicePointId },
            relations: ['owner']
        });

        if (spWithOwner && spWithOwner.owner) {
            const settings = await this.settingsService.getSettings();
            let body = `Bạn có yêu cầu đặt xe mới từ ${partner?.user.full_name} (${guestCount} khách)`;

            if (settings?.tpl_trip_request) {
                body = settings.tpl_trip_request;
                body = body.replace(/\[partner_name\]/g, partner?.user.full_name || 'Tài xế');
                body = body.replace(/\[trip_code\]/g, newTrip.trip_code || 'Không có');
                body = body.replace(/\[guest_count\]/g, guestCount.toString());
                body = body.replace(/\[vehicle_plate\]/g, partner?.vehicle_plate || 'Không có');
                body = body.replace(/\[created_time\]/g, new Date().toLocaleString() || 'Không có');
            }

            this.socketGateway.sendToUser(spWithOwner.owner.id, 'customer:new_trip_request', {
                trip_id: newTrip.trip_id,
                trip_code: newTrip.trip_code,
                guest_count: guestCount,
                partner: {
                    id: partnerId,
                    name: partner?.user.full_name,
                    vehicle_plate: partner?.vehicle_plate
                }
            }, {
                title: 'Yêu cầu chuyến xe',
                body: body
            });
        }

        return { message: 'Yêu cầu của bạn đã được gửi đi', trip_id: newTrip.trip_id, trip_code: newTrip.trip_code };
    }



    async confirmArrival(partnerId: string, tripId: string) {
        const trip = await this.tripRepo.findOne({
            where: {
                trip_id: tripId,
                partner: { id: partnerId }
            }
        });

        if (!trip) throw new NotFoundException('Đơn không tồn tại');

        if (trip.status !== TripStatus.PENDING_CONFIRMATION) {
            throw new BadRequestException('Trạng thái đơn không hợp lệ để xác nhận đến');
        }

        trip.status = TripStatus.ARRIVED;
        trip.arrival_time = new Date();

        await this.tripRepo.save(trip);

        const partner = await this.profileRepo.findOne({ where: { user: { id: partnerId } }, relations: ['user'] });

        const fullTrip = await this.tripRepo.findOne({
            where: { trip_id: tripId },
            relations: ['servicePoint', 'servicePoint.owner']
        });

        if (fullTrip && fullTrip.servicePoint.owner) {
            const settings = await this.settingsService.getSettings();
            let body = `Tài xế ${partner?.user.full_name} đã đến điểm đón`;

            if (settings?.tpl_driver_arrived) {
                body = settings.tpl_driver_arrived;
                body = body.replace(/\[partner_name\]/g, partner?.user.full_name || 'Tài xế');
                body = body.replace(/\[trip_code\]/g, trip.trip_code || 'Không có');
                body = body.replace(/\[guest_count\]/g, trip.guest_count.toString());
                body = body.replace(/\[vehicle_plate\]/g, partner?.vehicle_plate || 'Không có');
                body = body.replace(/\[arrival_time\]/g, trip.arrival_time?.toLocaleString() || 'Không có');
            }

            this.socketGateway.sendToUser(fullTrip.servicePoint.owner.id, 'customer:driver_arrived', {
                trip_id: trip.trip_id,
                trip_code: trip.trip_code,
                arrival_time: trip.arrival_time,
                partner: {
                    id: partnerId,
                    name: partner?.user.full_name,
                    vehicle_plate: partner?.vehicle_plate
                }
            }, {
                title: 'Tài xế đã đến',
                body: body
            });
        }

        return { message: 'Đã xác nhận đến điểm phục vụ' };
    }

    async cancelTrip(partnerId: string, tripId: string, reason?: string) {
        const trip = await this.tripRepo.findOne({
            where: {
                trip_id: tripId,
                partner: { id: partnerId }
            }
        });

        if (!trip) throw new NotFoundException('Đơn không tồn tại');

        if (trip.status !== TripStatus.PENDING_CONFIRMATION && trip.status !== TripStatus.ARRIVED) {
            throw new BadRequestException('Không thể huỷ đơn ở trạng thái này');
        }

        trip.status = TripStatus.CANCELLED;
        if (reason) trip.reject_reason = reason;
        await this.tripRepo.save(trip);

        const fullTrip = await this.tripRepo.findOne({
            where: { trip_id: tripId },
            relations: ['servicePoint', 'servicePoint.owner']
        });

        if (fullTrip && fullTrip.servicePoint.owner) {
            const partner = await this.profileRepo.findOne({ where: { user: { id: partnerId } }, relations: ['user'] });
            const settings = await this.settingsService.getSettings();
            let body = `Tài xế đã huỷ chuyến đi. Lý do: ${reason || 'Không có lý do'}`;

            if (settings?.tpl_trip_cancelled) {
                body = settings.tpl_trip_cancelled;
                body = body.replace(/\[partner_name\]/g, partner?.user.full_name || 'Tài xế');
                body = body.replace(/\[trip_code\]/g, trip.trip_code || 'Không có');
                body = body.replace(/\[guest_count\]/g, trip.guest_count.toString());
                body = body.replace(/\[reason\]/g, reason || 'Không có lý do');
                body = body.replace(/\[created_time\]/g, trip.created_at.toLocaleString());
            }

            this.socketGateway.sendToUser(fullTrip.servicePoint.owner.id, 'customer:trip_cancelled', {
                trip_id: trip.trip_id,
                trip_code: trip.trip_code,
                reason: reason || 'Tài xế đã huỷ chuyến'
            }, {
                title: 'Chuyến đi bị huỷ',
                body: body
            });
        }

        return { message: 'Đã huỷ đơn thành công' };
    }

    async getMyTripRequests(partnerId: string, page: number = 1, limit: number = 5, fromDate?: string, toDate?: string) {
        const whereCondition: any = { partner: { id: partnerId } };

        if (fromDate && toDate) {
            const start = new Date(fromDate);
            const end = new Date(toDate);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                whereCondition.created_at = Between(start, end);
            }
        } else if (fromDate) {
            const start = new Date(fromDate);
            if (!isNaN(start.getTime())) {
                start.setHours(0, 0, 0, 0);
                const end = new Date();
                end.setHours(23, 59, 59, 999);
                whereCondition.created_at = Between(start, end);
            }
        }

        const [trips, total] = await this.tripRepo.findAndCount({
            where: whereCondition,
            relations: ['servicePoint'],
            order: { created_at: 'DESC' },
            skip: (page - 1) * limit,
            take: limit
        });

        const data = trips.map(trip => ({
            id: trip.trip_id,
            service_point_name: trip.servicePoint.name,
            service_point_address: trip.servicePoint.address,
            guest_count: trip.guest_count,
            actual_guest_count: trip.actual_guest_count,
            status: trip.status,
            reward_goxu: Number(trip.reward_snapshot),
            created_at: trip.created_at,
            arrival_time: trip.arrival_time,
            trip_code: trip.trip_code,
        }));

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}