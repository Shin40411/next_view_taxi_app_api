import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyBankAccountDto } from './create-company-bank-account.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateCompanyBankAccountDto extends PartialType(CreateCompanyBankAccountDto) {
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
