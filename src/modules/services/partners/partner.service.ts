import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PartnerProfile } from 'src/entities/partner-profile.entity';
import { ServicePoint } from 'src/entities/service-point.entity';
import { Trip } from 'src/entities/trip.entity';
import { TripStatus } from 'src/utils/trips-status-enum';
import { Repository, Between, DataSource } from 'typeorm';
import { SocketGateway } from 'src/modules/socket/socket.gateway';

@Injectable()
export class PartnerService {
    constructor(
        @InjectRepository(PartnerProfile) private profileRepo: Repository<PartnerProfile>,
        @InjectRepository(Trip) private tripRepo: Repository<Trip>,
        private dataSource: DataSource,
        private socketGateway: SocketGateway,
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
            .select(['sp.id', 'sp.name', 'sp.address', 'sp.reward_amount', 'sp.location', 'sp.advertising_budget']) // Lấy location để map zoom vào
            .where('sp.name LIKE :keyword', { keyword: `%${keyword}%` })
            .orWhere('sp.address LIKE :keyword', { keyword: `%${keyword}%` })
            .take(10)
            .getMany();
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
            avatarUrl: '', // TODO: Add avatar if available
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
            reward_snapshot: Number(servicePoint.reward_amount) * guestCount,
            status: TripStatus.PENDING_CONFIRMATION,
        });

        await this.tripRepo.save(newTrip);

        // Notify Customer (Shop Owner)
        const partner = await this.profileRepo.findOne({ where: { user: { id: partnerId } }, relations: ['user'] });

        // Ensure servicePoint owner is loaded if not already
        const spWithOwner = await this.dataSource.getRepository(ServicePoint).findOne({
            where: { id: servicePointId },
            relations: ['owner']
        });

        if (spWithOwner && spWithOwner.owner) {
            console.log('Emitting customer:new_trip_request to:', spWithOwner.owner.id);
            console.log('Payload:', {
                trip_id: newTrip.trip_id,
                guest_count: guestCount,
                partner: {
                    id: partnerId,
                    name: partner?.user.full_name,
                    vehicle_plate: partner?.vehicle_plate
                }
            });
            this.socketGateway.sendToUser(spWithOwner.owner.id, 'customer:new_trip_request', {
                trip_id: newTrip.trip_id,
                guest_count: guestCount,
                partner: {
                    id: partnerId,
                    name: partner?.user.full_name,
                    vehicle_plate: partner?.vehicle_plate
                }
            }, {
                title: 'Yêu cầu chuyến xe',
                body: `Bạn có yêu cầu đặt xe mới từ ${partner?.user.full_name} (${guestCount} khách)`
            });
        }

        return { message: 'Yêu cầu của bạn đã được gửi đi', trip_id: newTrip.trip_id };
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

        // Notify Customer
        const partner = await this.profileRepo.findOne({ where: { user: { id: partnerId } }, relations: ['user'] });

        const fullTrip = await this.tripRepo.findOne({
            where: { trip_id: tripId },
            relations: ['servicePoint', 'servicePoint.owner']
        });

        if (fullTrip && fullTrip.servicePoint.owner) {
            this.socketGateway.sendToUser(fullTrip.servicePoint.owner.id, 'customer:driver_arrived', {
                trip_id: trip.trip_id,
                arrival_time: trip.arrival_time,
                partner: {
                    id: partnerId,
                    name: partner?.user.full_name,
                    vehicle_plate: partner?.vehicle_plate
                }
            }, {
                title: 'Tài xế đã đến',
                body: `Tài xế ${partner?.user.full_name} đã đến điểm đón`
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
        if (reason) trip.reject_reason = reason; // Reuse reject_reason for cancellation reason
        await this.tripRepo.save(trip);

        // Notify Customer
        const fullTrip = await this.tripRepo.findOne({
            where: { trip_id: tripId },
            relations: ['servicePoint', 'servicePoint.owner']
        });

        if (fullTrip && fullTrip.servicePoint.owner) {
            this.socketGateway.sendToUser(fullTrip.servicePoint.owner.id, 'customer:trip_cancelled', {
                trip_id: trip.trip_id,
                reason: reason || 'Tài xế đã huỷ chuyến'
            }, {
                title: 'Chuyến đi bị huỷ',
                body: `Tài xế đã huỷ chuyến đi. Lý do: ${reason || 'Không có lý do'}`
            });
        }

        return { message: 'Đã huỷ đơn thành công' };
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
            arrival_time: trip.arrival_time,
        }));
    }
}