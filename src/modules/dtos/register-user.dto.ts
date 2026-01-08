import { UserRole } from "src/utils/user-role.enum";

export * from './create-user.dto';
export * from './update-user.dto';
export * from './admin-change-password.dto';
export * from './change-password.dto';

import { IsNotEmpty, IsOptional, MaxLength, IsString, IsNumber, IsEnum } from 'class-validator';

export class RegisterDto {
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

    @IsNotEmpty()
    @IsEnum(UserRole)
    role: UserRole;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    vehicle_plate?: string;

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
    driver_license_front?: string;

    @IsOptional()
    @IsString()
    driver_license_back?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    address?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    province?: string;

    @IsOptional()
    // @IsNumber() // TypeORM might parse form-data string as number automatically or we use Transform. 
    // Since it's often sent as string in FormData, let's allow string but careful.
    // Actually nestjs-form-data or interceptors handle it. Let's assume it converts or we check logic elsewhere.
    // For now, simple validation.
    reward_amount?: number;

    @IsOptional()
    discount?: number;
}