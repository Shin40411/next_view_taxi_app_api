import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyBankAccount } from '../../../entities/company-bank-account.entity';
import { CreateCompanyBankAccountDto } from '../../dtos/create-company-bank-account.dto';
import { UpdateCompanyBankAccountDto } from '../../dtos/update-company-bank-account.dto';

@Injectable()
export class CompanyBankAccountService {
    constructor(
        @InjectRepository(CompanyBankAccount)
        private repo: Repository<CompanyBankAccount>,
    ) { }

    create(dto: CreateCompanyBankAccountDto) {
        const account = this.repo.create(dto);
        return this.repo.save(account);
    }

    findAll() {
        return this.repo.find();
    }

    findActive() {
        return this.repo.find({ where: { isActive: true } });
    }

    async findOne(id: string) {
        const account = await this.repo.findOne({ where: { id } });
        if (!account) {
            throw new NotFoundException(`Company Bank Account with ID ${id} not found`);
        }
        return account;
    }

    async update(id: string, dto: UpdateCompanyBankAccountDto) {
        const account = await this.findOne(id);
        Object.assign(account, dto);
        return this.repo.save(account);
    }

    async remove(id: string) {
        const account = await this.findOne(id);
        return this.repo.remove(account);
    }
}
