
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from 'src/entities/contract.entity';
import { CreateContractDto } from 'src/modules/dtos/create-contract.dto';
import { User } from 'src/entities/user.entity';
import { ContractStatus } from 'src/utils/contract-status.enum';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class ContractService {
    constructor(
        @InjectRepository(Contract)
        private contractRepository: Repository<Contract>,
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
        const contract = await this.contractRepository.findOne({ where: { id } });
        if (!contract) {
            throw new NotFoundException('Không tìm thấy dữ liệu hợp đồng');
        }

        contract.status = ContractStatus.TERMINATED;
        return this.contractRepository.save(contract);
    }
}
