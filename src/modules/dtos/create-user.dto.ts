import { IsNotEmpty, IsOptional, IsString, MaxLength, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { UserRole } from "src/utils/user-role.enum";

export class CreateUserDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    username: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    password: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    full_name: string;

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
    avatar?: string;

    @IsNotEmpty()
    @IsEnum(UserRole)
    role: UserRole;

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
    tax_id?: string;

    @IsOptional()
    @IsString()
    driver_license?: string;

    @IsOptional()
    @IsString()
    driver_license_front?: string;

    @IsOptional()
    @IsString()
    driver_license_back?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    address?: string;

    @IsOptional()
    @IsNumber()
    latitude?: number;

    @IsOptional()
    @IsNumber()
    longitude?: number;

    @IsOptional()
    @IsNumber()
    geofence_radius?: number;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    province?: string;

    @IsOptional()
    @IsNumber()
    reward_amount?: number;

    @IsOptional()
    @IsNumber()
    discount?: number;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

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

    @IsOptional()
    @IsString()
    contract?: string;
}
