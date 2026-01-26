import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateContractDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    full_name: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(4)
    birth_year: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(15)
    phone_number: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(12)
    cccd: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    address: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    vehicle?: string;

    @IsString()
    @IsNotEmpty()
    signature: string;
}
