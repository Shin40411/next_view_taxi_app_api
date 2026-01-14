import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCompanyBankAccountDto {
    @IsString()
    @IsNotEmpty()
    bankName: string;

    @IsString()
    @IsNotEmpty()
    accountName: string;

    @IsString()
    @IsNotEmpty()
    accountNo: string;

    @IsString()
    @IsOptional()
    content?: string;
}
