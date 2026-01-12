import { IsOptional, IsString, MaxLength, IsBoolean, IsNumber } from 'class-validator';

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
    reward_amount?: number;

    @IsOptional()
    @IsNumber()
    discount?: number;

    @IsOptional()
    @IsNumber()
    advertising_budget?: number;

    @IsOptional()
    @IsNumber()
    geofence_radius?: number; // meters

    @IsOptional()
    @IsNumber()
    latitude?: number;

    @IsOptional()
    @IsNumber()
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
