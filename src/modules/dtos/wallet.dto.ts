import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionStatus } from 'src/utils/wallet-transaction-enum';

export class CreateDepositDto {
    @IsNumber()
    @Min(10)
    @Type(() => Number)
    amount: number;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    bill?: string;
}

export class CreateWithdrawDto {
    @IsNumber()
    @Min(50000)
    amount: number;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    bankName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    accountNumber?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    accountHolderName?: string;
}

export class CreateTransferDto {
    @IsUUID()
    @IsNotEmpty()
    receiverId: string;

    @IsNumber()
    @Min(10000)
    //@Max(1000000000)
    amount: number;

    @IsOptional()
    @IsString()
    @MaxLength(500)
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
    @MaxLength(255)
    reason?: string;
}
