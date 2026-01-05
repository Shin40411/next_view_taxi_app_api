import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ServicePoint } from 'src/entities/service-point.entity';
import { PointTransaction } from 'src/entities/point-transaction.entity';
import { TransactionType } from 'src/utils/point-transaction-enum';
import { UserRole } from 'src/utils/user-role.enum';

@Injectable()
export class WalletService {
    constructor(
        @InjectRepository(ServicePoint)
        private servicePointRepository: Repository<ServicePoint>,
        @InjectRepository(PointTransaction)
        private pointTransactionRepository: Repository<PointTransaction>,
        private dataSource: DataSource,
    ) { }

    async findAll(page: number = 1, limit: number = 10, search?: string) {
        const query = this.servicePointRepository.createQueryBuilder('sp')
            .leftJoinAndSelect('sp.owner', 'owner')
            .where('owner.role IN (:...roles)', { roles: [UserRole.PARTNER, UserRole.CUSTOMER, UserRole.INTRODUCER] })
            .orderBy('sp.advertising_budget', 'DESC');

        if (search) {
            query.andWhere(
                '(owner.full_name LIKE :search OR owner.phone_number LIKE :search OR sp.name LIKE :search)',
                { search: `%${search}%` }
            );
        }

        const [data, total] = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async deposit(servicePointId: string, amountVnd: number) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const servicePoint = await queryRunner.manager.findOne(ServicePoint, {
                where: { id: servicePointId },
                relations: ['owner'],
            });

            if (!servicePoint) {
                throw new NotFoundException('Service point not found');
            }

            // Conversion: 1,000 VND = 1 Point
            const points = Math.floor(amountVnd / 1000);

            if (points <= 0) {
                throw new Error('Invalid deposit amount');
            }

            // Update Balance
            servicePoint.advertising_budget = Number(servicePoint.advertising_budget) + points;
            await queryRunner.manager.save(servicePoint);

            // Create Transaction Record
            const transaction = new PointTransaction();
            transaction.servicePoint = servicePoint;
            transaction.amount = points;
            transaction.type = TransactionType.DEPOSIT;
            transaction.description = `Admin deposit: ${amountVnd.toLocaleString()} VND`;

            await queryRunner.manager.save(transaction);

            await queryRunner.commitTransaction();

            return {
                message: 'Deposit successful',
                newBalance: servicePoint.advertising_budget,
                pointsAdded: points,
            };

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
