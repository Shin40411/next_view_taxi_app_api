import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyBankAccount } from '../../entities/company-bank-account.entity';
import { CompanyBankAccountService } from '../services/company-bank-account/company-bank-account.service';
import { CompanyBankAccountController } from '../controller/company-bank-account/company-bank-account.controller';

@Module({
    imports: [TypeOrmModule.forFeature([CompanyBankAccount])],
    controllers: [CompanyBankAccountController],
    providers: [CompanyBankAccountService],
    exports: [CompanyBankAccountService],
})
export class CompanyBankAccountModule { }
