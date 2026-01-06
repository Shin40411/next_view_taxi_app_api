import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ServicePoint } from 'src/entities/service-point.entity';
import { PointTransaction } from 'src/entities/point-transaction.entity';
import { WalletTransaction } from 'src/entities/wallet-transaction.entity';
import { User } from 'src/entities/user.entity';
import { PartnerProfile } from 'src/entities/partner-profile.entity';
import { TransactionType, TransactionStatus } from 'src/utils/wallet-transaction-enum';
import { TransactionType as LegacyTransactionType } from 'src/utils/point-transaction-enum';
import { UserRole } from 'src/utils/user-role.enum';
import { CreateDepositDto, CreateWithdrawDto, CreateTransferDto } from 'src/modules/dtos/wallet.dto';
import { SocketGateway } from 'src/modules/socket/socket.gateway';

@Injectable()
export class WalletService {
    constructor(
        @InjectRepository(ServicePoint)
        private servicePointRepository: Repository<ServicePoint>,
        @InjectRepository(PointTransaction)
        private pointTransactionRepository: Repository<PointTransaction>,
        @InjectRepository(WalletTransaction)
        private walletTransactionRepository: Repository<WalletTransaction>,
        private dataSource: DataSource,
        private socketGateway: SocketGateway,
    ) { }

    private getTransactionTypeName(type: TransactionType): string {
        switch (type) {
            case TransactionType.DEPOSIT:
                return 'Nạp Goxu';
            case TransactionType.WITHDRAW:
                return 'Rút Goxu';
            case TransactionType.TRANSFER:
                return 'Chuyển Goxu';
            default:
                return 'Giao dịch';
        }
    }

    private maskPhone(phone: string): string {
        if (!phone || phone.length < 7) return phone;
        return phone.substring(0, 3) + '****' + phone.substring(phone.length - 3);
    }

    async findAll(page: number = 1, limit: number = 10, search?: string, fromDate?: string, toDate?: string) {
        const query = this.walletTransactionRepository.createQueryBuilder('wt')
            .leftJoinAndSelect('wt.sender', 'sender')
            .leftJoinAndSelect('wt.receiver', 'receiver')
            .orderBy('wt.created_at', 'DESC');

        if (search) {
            query.andWhere(
                '(sender.full_name LIKE :search OR sender.username LIKE :search OR receiver.full_name LIKE :search)',
                { search: `%${search}%` }
            );
        }

        if (fromDate) {
            const from = new Date(fromDate);
            from.setHours(0, 0, 0, 0);
            query.andWhere('wt.created_at >= :fromDate', { fromDate: from });
        }

        if (toDate) {
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            query.andWhere('wt.created_at <= :toDate', { toDate: to });
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

    async findByUser(userId: string, page: number = 1, limit: number = 10, search?: string, fromDate?: string, toDate?: string) {
        const query = this.walletTransactionRepository.createQueryBuilder('wt')
            .leftJoinAndSelect('wt.sender', 'sender')
            .leftJoinAndSelect('wt.receiver', 'receiver')
            .where('(sender.id = :userId OR receiver.id = :userId)', { userId })
            .orderBy('wt.created_at', 'DESC');

        if (search) {
            query.andWhere(
                '(sender.full_name LIKE :search OR sender.username LIKE :search OR receiver.full_name LIKE :search)',
                { search: `%${search}%` }
            );
        }

        if (fromDate) {
            const from = new Date(fromDate);
            from.setHours(0, 0, 0, 0);
            query.andWhere('wt.created_at >= :fromDate', { fromDate: from });
        }

        if (toDate) {
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            query.andWhere('wt.created_at <= :toDate', { toDate: to });
        }

        const [data, total] = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        // Mask phone numbers
        const maskedData = data.map(tx => {
            if (tx.sender) tx.sender.username = this.maskPhone(tx.sender.username);
            if (tx.receiver) tx.receiver.username = this.maskPhone(tx.receiver.username);
            return tx;
        });

        return {
            data: maskedData,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async requestDeposit(userId: string, dto: CreateDepositDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const user = await queryRunner.manager.findOne(User, { where: { id: userId } });
            if (!user) throw new NotFoundException('Không tìm thấy tài khoản');

            const transaction = new WalletTransaction();
            transaction.sender = user;
            transaction.receiver = null;
            transaction.amount = dto.amount;
            transaction.type = TransactionType.DEPOSIT;
            transaction.status = TransactionStatus.PENDING;
            transaction.bill = dto.bill || '';

            await queryRunner.manager.save(transaction);
            await queryRunner.commitTransaction();
            return transaction;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async requestWithdraw(userId: string, dto: CreateWithdrawDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const user = await queryRunner.manager.findOne(User, {
                where: { id: userId },
                relations: ['partnerProfile', 'servicePoints'],
                lock: { mode: 'pessimistic_write' }
            });

            if (!user) throw new NotFoundException('Không tìm thấy tài khoản');

            const handleFailedTransaction = async (reason: string) => {
                const failedTx = new WalletTransaction();
                failedTx.sender = user;
                failedTx.amount = dto.amount;
                failedTx.type = TransactionType.WITHDRAW;
                failedTx.status = TransactionStatus.FALSE;

                await queryRunner.manager.save(failedTx);
                await queryRunner.commitTransaction();
                throw new BadRequestException(reason);
            };

            let currentBalance = 0;
            if ([UserRole.PARTNER, UserRole.INTRODUCER].includes(user.role) && user.partnerProfile) {
                currentBalance = Number(user.partnerProfile.wallet_balance);
            } else if (user.role === UserRole.CUSTOMER && user.servicePoints?.length > 0) {
                currentBalance = Number(user.servicePoints[0].advertising_budget);
            }

            if (currentBalance < dto.amount) {
                await handleFailedTransaction('Không đủ số dư để rút');
            }

            // Trừ tiền
            if ([UserRole.PARTNER, UserRole.INTRODUCER].includes(user.role) && user.partnerProfile) {
                user.partnerProfile.wallet_balance = Number(user.partnerProfile.wallet_balance) - dto.amount;
                await queryRunner.manager.save(user.partnerProfile);
            } else if (user.role === UserRole.CUSTOMER && user.servicePoints?.length > 0) {
                user.servicePoints[0].advertising_budget = Number(user.servicePoints[0].advertising_budget) - dto.amount;
                await queryRunner.manager.save(user.servicePoints[0]);
            }

            const transaction = new WalletTransaction();
            transaction.sender = user;
            transaction.amount = dto.amount;
            transaction.type = TransactionType.WITHDRAW;
            transaction.status = TransactionStatus.PENDING;
            await queryRunner.manager.save(transaction);
            await queryRunner.commitTransaction();
            return transaction;

        } catch (err) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async transfer(userId: string, dto: CreateTransferDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const sender = await queryRunner.manager.findOne(User, {
                where: { id: userId },
                relations: ['partnerProfile', 'servicePoints']
            });
            const receiver = await queryRunner.manager.findOne(User, {
                where: { id: dto.receiverId },
                relations: ['partnerProfile', 'servicePoints']
            });

            if (!sender || !receiver) {
                throw new NotFoundException('Không tìm thấy người gửi hoặc người nhận');
            }

            const handleFailedTransaction = async (reason: string) => {
                const failedTx = new WalletTransaction();
                failedTx.sender = sender;
                failedTx.receiver = receiver;
                failedTx.amount = dto.amount;
                failedTx.type = TransactionType.TRANSFER;
                failedTx.status = TransactionStatus.FALSE;

                await queryRunner.manager.save(failedTx);
                await queryRunner.commitTransaction();
                throw new BadRequestException(reason);
            };

            // Kiểm tra chuyển cho chính mình
            if (sender.id === receiver.id) {
                await handleFailedTransaction('Không thể chuyển tiền cho chính mình');
            }

            // Tính toán số dư hiện tại
            let senderBalance = 0;
            if ([UserRole.PARTNER, UserRole.INTRODUCER].includes(sender.role) && sender.partnerProfile) {
                senderBalance = Number(sender.partnerProfile.wallet_balance);
            } else if (sender.role === UserRole.CUSTOMER && sender.servicePoints?.length > 0) {
                senderBalance = Number(sender.servicePoints[0].advertising_budget);
            }

            // Kiểm tra số dư
            if (senderBalance < dto.amount) {
                await handleFailedTransaction('Số dư không đủ để chuyển');
            }

            // Trừ tiền người gửi
            if ([UserRole.PARTNER, UserRole.INTRODUCER].includes(sender.role) && sender.partnerProfile) {
                sender.partnerProfile.wallet_balance = Number(sender.partnerProfile.wallet_balance) - dto.amount;
                await queryRunner.manager.save(sender.partnerProfile);
            } else if (sender.role === UserRole.CUSTOMER && sender.servicePoints?.length > 0) {
                sender.servicePoints[0].advertising_budget = Number(sender.servicePoints[0].advertising_budget) - dto.amount;
                await queryRunner.manager.save(sender.servicePoints[0]);
            }

            // Cộng tiền người nhận
            if ([UserRole.PARTNER, UserRole.INTRODUCER].includes(receiver.role) && receiver.partnerProfile) {
                receiver.partnerProfile.wallet_balance = Number(receiver.partnerProfile.wallet_balance) + dto.amount;
                await queryRunner.manager.save(receiver.partnerProfile);
            } else if (receiver.role === UserRole.CUSTOMER && receiver.servicePoints?.length > 0) {
                receiver.servicePoints[0].advertising_budget = Number(receiver.servicePoints[0].advertising_budget) + dto.amount;
                await queryRunner.manager.save(receiver.servicePoints[0]);
            }

            // Lưu transaction THÀNH CÔNG
            const transaction = new WalletTransaction();
            transaction.sender = sender;
            transaction.receiver = receiver;
            transaction.amount = dto.amount;
            transaction.type = TransactionType.TRANSFER;
            transaction.status = TransactionStatus.SUCCESS;

            await queryRunner.manager.save(transaction);
            await queryRunner.commitTransaction();
            return transaction;

        } catch (err) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async updateTransactionStatus(transactionId: string, accept: boolean, adminId: string, reason?: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const transaction = await queryRunner.manager.findOne(WalletTransaction, {
                where: { id: transactionId },
                relations: ['sender', 'sender.partnerProfile', 'sender.servicePoints']
            });

            if (!transaction) throw new NotFoundException('Thông tin giao dịch không tồn tại');
            if (transaction.status !== TransactionStatus.PENDING) throw new BadRequestException('Giao dịch đã được xử lý');

            const admin = await queryRunner.manager.findOne(User, { where: { id: adminId } });
            if (!admin) throw new NotFoundException('Không tìm thấy tài khoản duyệt yêu cầu');

            const user = await queryRunner.manager.findOne(User, {
                where: { id: transaction.sender.id },
                relations: ['partnerProfile', 'servicePoints'],
                lock: { mode: 'pessimistic_write' }
            });

            if (!user) throw new NotFoundException('Không tìm thấy tài khoản người dùng');

            transaction.employee = admin;
            if (reason) transaction.reason = reason;

            // --- XỬ LÝ NẠP TIỀN (DEPOSIT) ---
            if (transaction.type === TransactionType.DEPOSIT) {
                const amountToAdd = Number(transaction.amount);
                if (amountToAdd > 0 && accept) {
                    if ([UserRole.PARTNER, UserRole.INTRODUCER].includes(user.role) && user.partnerProfile) {
                        user.partnerProfile.wallet_balance = Number(user.partnerProfile.wallet_balance) + amountToAdd;
                        await queryRunner.manager.save(user.partnerProfile);
                    } else if (user.role === UserRole.CUSTOMER && user.servicePoints?.length > 0) {
                        user.servicePoints[0].advertising_budget = Number(user.servicePoints[0].advertising_budget) + amountToAdd;
                        await queryRunner.manager.save(user.servicePoints[0]);
                    }
                    transaction.status = TransactionStatus.SUCCESS;
                } else {
                    transaction.status = TransactionStatus.FALSE;
                }
            }
            // --- XỬ LÝ RÚT TIỀN (WITHDRAW) ---
            else if (transaction.type === TransactionType.WITHDRAW) {
                if (accept) {
                    transaction.status = TransactionStatus.SUCCESS;
                } else {
                    const amountToRefund = Number(transaction.amount);

                    if ([UserRole.PARTNER, UserRole.INTRODUCER].includes(user.role) && user.partnerProfile) {
                        user.partnerProfile.wallet_balance = Number(user.partnerProfile.wallet_balance) + amountToRefund;
                        await queryRunner.manager.save(user.partnerProfile);
                    } else if (user.role === UserRole.CUSTOMER && user.servicePoints?.length > 0) {
                        user.servicePoints[0].advertising_budget = Number(user.servicePoints[0].advertising_budget) + amountToRefund;
                        await queryRunner.manager.save(user.servicePoints[0]);
                    }
                    transaction.status = TransactionStatus.FALSE;
                }
            }
            else {
                transaction.status = TransactionStatus.FALSE;
            }

            await queryRunner.manager.save(transaction);
            await queryRunner.commitTransaction();

            // SEND NOTIFICATION
            const typeName = this.getTransactionTypeName(transaction.type);
            const amountFormatted = Number(transaction.amount).toLocaleString('vi-VN');

            if (transaction.status === TransactionStatus.SUCCESS) {
                this.socketGateway.sendToUser(
                    user.id,
                    'wallet_transaction_updated',
                    transaction,
                    {
                        title: 'Giao dịch thành công',
                        body: `Yêu cầu ${typeName} số tiền ${amountFormatted} đã được duyệt thành công.`,
                        type: 'WALLET_SUCCESS'
                    }
                );
            } else if (transaction.status === TransactionStatus.FALSE) {
                this.socketGateway.sendToUser(
                    user.id,
                    'wallet_transaction_updated',
                    transaction,
                    {
                        title: 'Giao dịch bị từ chối',
                        body: `Yêu cầu ${typeName} số tiền ${amountFormatted} đã bị từ chối. Lý do: ${transaction.reason || 'Không có lý do cụ thể'}.`,
                        type: 'WALLET_FAILED'
                    }
                );
            }

            return transaction;
        } catch (err) {
            if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
