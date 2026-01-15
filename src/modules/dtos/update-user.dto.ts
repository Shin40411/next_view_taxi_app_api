import { IsOptional, IsString, MaxLength, IsBoolean, IsNumber } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    full_name?: string;

    @IsOptional()
    @IsString()
    avatar?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    username?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    email?: string;

    @IsOptional()
    @IsString()
    @MaxLength(15)
    phone_number?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    password?: string;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    })
    is_active?: boolean;

    // Partner specific
    @IsOptional()
    @IsString()
    @MaxLength(20)
    vehicle_plate?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    brand?: string;

    @IsOptional()
    @IsString()
    id_card_front?: string;

    @IsOptional()
    @IsString()
    id_card_back?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    id_card_num?: string;

    @IsOptional()
    @IsString()
    date_of_birth?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    sex?: string;

    @IsOptional()
    @IsString()
    driver_license_front?: string;

    @IsOptional()
    @IsString()
    driver_license_back?: string;

    // ServicePoint specific (Customer)
    @IsOptional()
    @IsString()
    @MaxLength(255)
    address?: string;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    reward_amount?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    discount?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    advertising_budget?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    geofence_radius?: number; // meters

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    latitude?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    longitude?: number;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    province?: string;

    @IsOptional()
    @IsString()
    contract?: string;

    // Bank Account
    @IsOptional()
    @IsString()
    @MaxLength(100)
    bank_name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    account_number?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    account_holder_name?: string;
}
