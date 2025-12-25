import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ServicePoint } from 'src/entities/service-point.entity';
import { Trip, TripStatus } from 'src/entities/trip.entity';
import { User } from 'src/entities/user.entity';
import { Repository, DataSource, In } from 'typeorm';

@Injectable()
export class CustomerService {
    constructor(
        @InjectRepository(ServicePoint) private serviceRepo: Repository<ServicePoint>,
        @InjectRepository(Trip) private tripRepo: Repository<Trip>,
        @InjectRepository(User) private userRepo: Repository<User>,
        private dataSource: DataSource,
    ) { }

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

            const rewardAmount = Number(trip.reward_snapshot);
            const shopBudget = Number(trip.servicePoint.advertising_budget);


            if (shopBudget < rewardAmount) {
                throw new BadRequestException('Ngân sách quảng cáo của quán không đủ. Vui lòng nạp thêm GoXu.');
            }

            trip.servicePoint.advertising_budget = shopBudget - rewardAmount;
            await queryRunner.manager.save(trip.servicePoint);

            const driverProfile = trip.partner.partnerProfile;
            driverProfile.wallet_balance = Number(driverProfile.wallet_balance) + rewardAmount;
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

    async rejectTrip(ownerId: string, tripId: string, actualCount: number) {
        const trip = await this.tripRepo.findOne({
            where: { trip_id: tripId },
            relations: ['servicePoint', 'servicePoint.owner']
        });

        if (!trip) throw new BadRequestException('Đơn không tồn tại');
        if (trip.servicePoint.owner.id !== ownerId) throw new ForbiddenException('Không có quyền');

        trip.status = TripStatus.REJECTED;
        trip.actual_guest_count = actualCount;

        await this.tripRepo.save(trip);

        return { message: 'Đã huỷ đơn và gửi báo cáo lên Admin' };
    }
}