
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from 'src/entities/contract.entity';
import { CreateContractDto } from 'src/modules/dtos/create-contract.dto';
import { User } from 'src/entities/user.entity';
import { ContractStatus } from 'src/utils/contract-status.enum';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SocketGateway } from 'src/modules/socket/socket.gateway';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ContractService {
    constructor(
        @InjectRepository(Contract)
        private contractRepository: Repository<Contract>,
        private socketGateway: SocketGateway,
        private notificationService: NotificationService,
    ) { }

    async create(createContractDto: CreateContractDto, user: User): Promise<Contract> {
        const contract = this.contractRepository.create({
            ...createContractDto,
            user,
        });
        return this.contractRepository.save(contract);
    }

    async findOneByUserId(userId: string): Promise<Contract | null> {
        return this.contractRepository.findOne({
            where: { user: { id: userId } },
        });
    }

    async findAll(page: number = 1, limit: number = 10): Promise<{ data: Contract[], total: number, page: number, limit: number, totalPages: number }> {
        const [data, total] = await this.contractRepository.findAndCount({
            relations: ['user'],
            skip: (page - 1) * limit,
            take: limit,
            order: { created_at: 'DESC' },
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async terminate(id: string): Promise<Contract> {
        const contract = await this.contractRepository.findOne({ where: { id }, relations: ['user'] });
        if (!contract) {
            throw new NotFoundException('Không tìm thấy dữ liệu hợp đồng');
        }

        contract.status = ContractStatus.TERMINATED;
        const savedContract = await this.contractRepository.save(contract);

        if (contract.user) {
            const notificationData = {
                title: 'Hợp đồng bị hủy bỏ',
                body: 'Hợp đồng của bạn đã bị hủy bỏ, vui lòng nhập đúng thông tin hợp lệ và ký hợp đồng mới.',
                type: 'contract:terminated'
            };

            this.socketGateway.sendToUser(contract.user.id, 'contract:terminated', notificationData);

            await this.notificationService.createForUser(contract.user.id, notificationData);
        }

        return savedContract;
    }

    async approve(id: string): Promise<Contract> {
        const contract = await this.contractRepository.findOne({ where: { id }, relations: ['user'] });
        if (!contract) {
            throw new NotFoundException('Không tìm thấy dữ liệu hợp đồng');
        }

        const now = new Date();
        contract.signed_date = now;

        const expireDate = new Date(now);
        expireDate.setFullYear(now.getFullYear() + 1);
        contract.expire_date = expireDate;

        contract.status = ContractStatus.ACTIVE;
        const savedContract = await this.contractRepository.save(contract);

        if (contract.user) {
            const notificationData = {
                title: 'Hợp đồng đã được duyệt',
                body: 'Hợp đồng của bạn đã được duyệt, bạn có thể bắt đầu sử dụng ví.',
                type: 'contract:approved'
            };
            this.socketGateway.sendToUser(contract.user.id, 'contract:approved', notificationData);

            await this.notificationService.createForUser(contract.user.id, notificationData);
        }

        return savedContract;
    }

    async extend(id: string): Promise<Contract> {
        const contract = await this.contractRepository.findOne({ where: { id } });
        if (!contract) {
            throw new NotFoundException('Không tìm thấy dữ liệu hợp đồng');
        }

        const currentExpire = contract.expire_date ? new Date(contract.expire_date) : new Date();
        currentExpire.setFullYear(currentExpire.getFullYear() + 1);
        contract.expire_date = currentExpire;
        contract.status = ContractStatus.ACTIVE;

        return this.contractRepository.save(contract);
    }
}
