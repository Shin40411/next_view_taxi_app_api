import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionStatus } from 'src/utils/wallet-transaction-enum';

export class CreateDepositDto {
    @IsNumber()
    @Min(10000)
    @Type(() => Number)
    amount: number;

    @IsOptional()
    @IsString()
    bill?: string;
}

export class CreateWithdrawDto {
    @IsNumber()
    @Min(50000)
    amount: number;

    @IsOptional()
    @IsString()
    bankName?: string;

    @IsOptional()
    @IsString()
    accountNumber?: string;

    @IsOptional()
    @IsString()
    accountHolderName?: string;
}

export class CreateTransferDto {
    @IsUUID()
    @IsNotEmpty()
    receiverId: string;

    @IsNumber()
    @Min(10000)
    amount: number;

    @IsOptional()
    @IsString()
    description?: string;
}

export class UpdateTransactionStatusDto {
    @IsUUID()
    @IsNotEmpty()
    transactionId: string;

    @IsBoolean()
    @IsNotEmpty()
    accept: boolean;

    @IsOptional()
    @IsString()
    reason?: string;
}
