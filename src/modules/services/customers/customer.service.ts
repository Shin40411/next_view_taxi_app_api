import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ServicePoint } from 'src/entities/service-point.entity';
import { Trip, TripStatus } from 'src/entities/trip.entity';
import { User } from 'src/entities/user.entity';
import { Repository, DataSource, In } from 'typeorm';
import { PointTransaction } from 'src/entities/point-transaction.entity';
import { TransactionType } from 'src/utils/point-transaction-enum';

@Injectable()
export class CustomerService {
    constructor(
        @InjectRepository(ServicePoint) private serviceRepo: Repository<ServicePoint>,
        @InjectRepository(Trip) private tripRepo: Repository<Trip>,

        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(PointTransaction) private transactionRepo: Repository<PointTransaction>,
        private dataSource: DataSource,
    ) { }

    async getCompletedTrips(ownerId: string) {
        const myShops = await this.serviceRepo.find({ where: { owner: { id: ownerId } } });
        const shopIds = myShops.map(shop => shop.id);

        if (shopIds.length === 0) return [];

        return this.tripRepo.find({
            where: {
                servicePoint: { id: In(shopIds) },
                status: TripStatus.COMPLETED
            },
            relations: ['partner', 'partner.partnerProfile'],
            order: { updated_at: 'DESC' }
        });
    }

    async getPendingTrips(ownerId: string) {

        const myShops = await this.serviceRepo.find({ where: { owner: { id: ownerId } } });
        const shopIds = myShops.map(shop => shop.id);

        if (shopIds.length === 0) return [];

        if (shopIds.length === 0) return [];
        return this.tripRepo.find({
            where: {
                servicePoint: { id: In(shopIds) },
                status: TripStatus.PENDING_CONFIRMATION
            },
            relations: ['partner', 'partner.partnerProfile'],
            order: { created_at: 'DESC' }
        });
    }

    async getRejectedTrips(ownerId: string) {
        const myShops = await this.serviceRepo.find({ where: { owner: { id: ownerId } } });
        const shopIds = myShops.map(shop => shop.id);

        if (shopIds.length === 0) return [];

        return this.tripRepo.find({
            where: {
                servicePoint: { id: In(shopIds) },
                status: TripStatus.REJECTED
            },
            relations: ['partner', 'partner.partnerProfile'],
            order: { updated_at: 'DESC' }
        });
    }

    async confirmTrip(ownerId: string, tripId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {

            const trip = await queryRunner.manager.findOne(Trip, {
                where: { trip_id: tripId },
                relations: ['servicePoint', 'servicePoint.owner', 'partner', 'partner.partnerProfile']
            });

            if (!trip) throw new BadRequestException('Đơn không tồn tại');
            if (trip.status !== TripStatus.PENDING_CONFIRMATION) throw new BadRequestException('Đơn đã được xử lý');
            if (trip.servicePoint.owner.id !== ownerId) throw new ForbiddenException('Bạn không sở hữu quán này');

            const rewardAmount = trip.reward_snapshot;
            const shopBudget = trip.servicePoint.advertising_budget;

            trip.servicePoint.advertising_budget = shopBudget - rewardAmount;
            await queryRunner.manager.save(trip.servicePoint);

            // Create Point Transaction
            const transaction = queryRunner.manager.create(PointTransaction, {
                servicePoint: trip.servicePoint,
                trip: trip,
                amount: -rewardAmount,
                type: TransactionType.TRIP_PAYMENT,
                description: `Xác nhận đơn #${trip.trip_id}`,
            });
            await queryRunner.manager.save(transaction);

            const driverProfile = trip.partner.partnerProfile;
            driverProfile.wallet_balance = Number(driverProfile.wallet_balance) + Number(rewardAmount);
            await queryRunner.manager.save(driverProfile);

            trip.status = TripStatus.COMPLETED;
            trip.actual_guest_count = trip.guest_count;
            await queryRunner.manager.save(trip);

            await queryRunner.commitTransaction();
            return { message: 'Đã xác nhận thành công. Tài xế đã nhận GoXu.' };

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
            totalSpent // Returns net change (+ or -)
        };
    }
}