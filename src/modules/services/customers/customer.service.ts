import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ServicePoint } from 'src/entities/service-point.entity';
import { Trip } from 'src/entities/trip.entity';
import { User } from 'src/entities/user.entity';
import { Repository, DataSource, In } from 'typeorm';
import { PointTransaction } from 'src/entities/point-transaction.entity';
import { TransactionType } from 'src/utils/point-transaction-enum';
import { TripStatus } from 'src/utils/trips-status-enum';
import { SocketGateway } from 'src/modules/socket/socket.gateway';
import { PartnerService } from 'src/modules/services/partners/partner.service';
import { PartnerProfile } from 'src/entities/partner-profile.entity';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class CustomerService {
    constructor(
        @InjectRepository(ServicePoint) private serviceRepo: Repository<ServicePoint>,
        @InjectRepository(Trip) private tripRepo: Repository<Trip>,

        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(PointTransaction) private transactionRepo: Repository<PointTransaction>,
        private dataSource: DataSource,
        private socketGateway: SocketGateway,
        private partnerService: PartnerService,
        private settingsService: SettingsService,
    ) { }

    private async getPaginatedTrips(ownerId: string, status: TripStatus | 'ALL', page: number, limit: number) {
        const myShops = await this.serviceRepo.find({ where: { owner: { id: ownerId } } });
        const shopIds = myShops.map(shop => shop.id);

        if (shopIds.length === 0) {
            return {
                data: [],
                meta: { total: 0, page, limit, totalPages: 0 }
            };
        }

        const whereCondition: any = {
            servicePoint: { id: In(shopIds) }
        };

        if (status !== 'ALL') {
            whereCondition.status = status;
        }

        const [trips, total] = await this.tripRepo.findAndCount({
            where: whereCondition,
            relations: ['partner', 'partner.partnerProfile', 'servicePoint'],
            order: { created_at: 'DESC' },
            skip: (page - 1) * limit,
            take: limit
        });

        return {
            data: trips,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getAllTrips(ownerId: string, page: number = 1, limit: number = 5) {
        return this.getPaginatedTrips(ownerId, 'ALL', page, limit);
    }

    async getArrivedTrips(ownerId: string, page: number = 1, limit: number = 5) {
        return this.getPaginatedTrips(ownerId, TripStatus.ARRIVED, page, limit);
    }

    async getCompletedTrips(ownerId: string, page: number = 1, limit: number = 5) {
        return this.getPaginatedTrips(ownerId, TripStatus.COMPLETED, page, limit);
    }

    async getPendingTrips(ownerId: string, page: number = 1, limit: number = 5) {
        return this.getPaginatedTrips(ownerId, TripStatus.PENDING_CONFIRMATION, page, limit);
    }

    async getRejectedTrips(ownerId: string, page: number = 1, limit: number = 5) {
        return this.getPaginatedTrips(ownerId, TripStatus.REJECTED, page, limit);
    }

    async getCancelledTrips(ownerId: string, page: number = 1, limit: number = 5) {
        return this.getPaginatedTrips(ownerId, TripStatus.CANCELLED, page, limit);
    }

    async confirmTrip(ownerId: string, tripId: string, actual_guest_count: number) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const trip = await queryRunner.manager.findOne(Trip, {
                where: { trip_id: tripId },
                relations: ['servicePoint', 'servicePoint.owner', 'partner', 'partner.partnerProfile']
            });

            if (!trip) throw new BadRequestException('Đơn không tồn tại');

            if (trip.status !== TripStatus.ARRIVED) {
                throw new BadRequestException('Tài xế chưa xác nhận đến hoặc đơn đã được xử lý');
            }

            if (trip.servicePoint.owner.id !== ownerId) throw new ForbiddenException('Bạn không sở hữu quán này');

            const rewardAmount = (Number(trip.reward_snapshot) / Number(trip.guest_count)) * actual_guest_count;
            const shopBudget = Number(trip.servicePoint.advertising_budget);

            trip.servicePoint.advertising_budget = shopBudget - rewardAmount;
            await queryRunner.manager.save(trip.servicePoint);

            const transaction = queryRunner.manager.create(PointTransaction, {
                servicePoint: trip.servicePoint,
                trip: trip,
                amount: -rewardAmount,
                type: TransactionType.TRIP_PAYMENT,
                description: `Xác nhận đơn #${trip.trip_id}`,
            });
            await queryRunner.manager.save(transaction);

            const driverProfile = trip.partner.partnerProfile;
            const newBalance = Number(driverProfile.wallet_balance) + rewardAmount;

            await queryRunner.manager.update(PartnerProfile, driverProfile.id, { wallet_balance: newBalance });

            trip.status = TripStatus.COMPLETED;
            trip.actual_guest_count = actual_guest_count;
            trip.reward_snapshot = rewardAmount;

            await queryRunner.manager.save(trip);

            await queryRunner.commitTransaction();

            if (trip.partner) {
                const settings = await this.settingsService.getSettings();
                let body = `Chuyến đi đã hoàn tất! Bạn nhận được ${rewardAmount} Goxu`;

                if (settings?.tpl_trip_confirmed) {
                    body = settings.tpl_trip_confirmed;
                    body = body.replace(/\[service_name\]/g, trip.servicePoint.name || 'Không có');
                    body = body.replace(/\[trip_code\]/g, trip.trip_code || 'Không có');
                    body = body.replace(/\[partner_name\]/g, trip.partner.full_name || 'Tài xế');
                    body = body.replace(/\[guest_count\]/g, actual_guest_count.toString());
                    body = body.replace(/\[vehicle_plate\]/g, driverProfile?.vehicle_plate || 'Không có');
                    body = body.replace(/\[created_time\]/g, trip.created_at.toLocaleString());
                    body = body.replace(/\[arrival_time\]/g, trip.arrival_time?.toLocaleString() || 'Không có');
                }

                this.socketGateway.sendToUser(trip.partner.id, 'partner:trip_confirmed', {
                    trip_id: trip.trip_id,
                    trip_code: trip.trip_code,
                    actual_guest_count: actual_guest_count,
                    reward_amount: rewardAmount
                }, {
                    title: 'Chuyến đi hoàn thành',
                    body: body
                });
            }

            return { message: 'Đã xác nhận thành công. Tài xế đã nhận Goxu.' };

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async rejectTrip(ownerId: string, tripId: string, actualCount: number, reason?: string) {
        const trip = await this.tripRepo.findOne({
            where: { trip_id: tripId },
            relations: ['servicePoint', 'servicePoint.owner']
        });

        if (!trip) throw new BadRequestException('Đơn không tồn tại');
        if (trip.servicePoint.owner.id !== ownerId) throw new ForbiddenException('Không có quyền');

        trip.status = TripStatus.REJECTED;
        trip.actual_guest_count = actualCount;
        if (reason) trip.reject_reason = reason;

        await this.tripRepo.save(trip);

        const fullTrip = await this.tripRepo.findOne({
            where: { trip_id: tripId },
            relations: ['partner']
        });

        if (fullTrip && fullTrip.partner) {
            const settings = await this.settingsService.getSettings();
            let body = `Khách hàng đã từ chối chuyến đi. Lý do: ${reason || 'Không có lý do'}`;

            if (settings?.tpl_trip_rejected) {
                body = settings.tpl_trip_rejected;
                body = body.replace(/\[trip_code\]/g, trip.trip_code || 'Không có');
                body = body.replace(/\[reason\]/g, reason || 'Không có lý do');
            }

            this.socketGateway.sendToUser(fullTrip.partner.id, 'partner:trip_rejected', {
                trip_id: trip.trip_id,
                trip_code: trip.trip_code,
                reason: reason || 'Khách hàng đã từ chối'
            }, {
                title: 'Chuyến đi bị từ chối',
                body: body
            });
        }

        return { message: 'Đã huỷ đơn!' };
    }

    async getBudgetStatistics(ownerId: string, range: string) {
        const query = this.transactionRepo.createQueryBuilder('tx')
            .leftJoinAndSelect('tx.servicePoint', 'servicePoint')
            .leftJoinAndSelect('servicePoint.owner', 'owner')
            .where('owner.id = :ownerId', { ownerId });

        const now = new Date();
        let startDate: Date | undefined;
        let endDate: Date | undefined;

        switch (range) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                endDate = new Date(now.setHours(23, 59, 59, 999));
                break;
            case 'yesterday':
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                startDate = new Date(yesterday.setHours(0, 0, 0, 0));
                endDate = new Date(yesterday.setHours(23, 59, 59, 999));
                break;
            case '7_days':
                const sevenDaysAgo = new Date(now);
                sevenDaysAgo.setDate(now.getDate() - 7);
                startDate = new Date(sevenDaysAgo.setHours(0, 0, 0, 0));
                endDate = new Date();
                break;
            case 'this_month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            default:
                break;
        }

        if (startDate && endDate) {
            query.andWhere('tx.created_at BETWEEN :startDate AND :endDate', { startDate, endDate });
        }

        const transactions = await query.getMany();

        const totalSpent = transactions
            .reduce((sum, t) => sum + Number(t.amount), 0);

        return {
            totalSpent
        };
    }

    async getActiveDrivers() {
        return this.partnerService.getActivePartners();
    }
}