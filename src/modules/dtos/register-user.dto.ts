import { UserRole } from "src/utils/user-role.enum";

export * from './create-user.dto';
export * from './update-user.dto';
export * from './admin-change-password.dto';

export * from './change-password.dto';
import { Sanitize } from 'src/utils/transformers/sanitize.transformer';

import { IsNotEmpty, IsOptional, MaxLength, IsString, IsNumber, IsEnum } from 'class-validator';

export class RegisterDto {

    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    @Sanitize()
    username: string;


    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    password: string;


    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    @Sanitize()
    full_name: string;


    @IsOptional()
    @IsString()
    @MaxLength(255)
    @Sanitize()
    email?: string;


    @IsOptional()
    @IsString()
    @MaxLength(15)
    @Sanitize()
    phone_number?: string;

    @IsNotEmpty()
    @IsEnum(UserRole)
    role: UserRole;


    @IsOptional()
    @IsString()
    @MaxLength(20)
    @Sanitize()
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
    @Sanitize()
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
    @Sanitize()
    address?: string;


    @IsOptional()
    @IsString()
    @MaxLength(100)
    @Sanitize()
    province?: string;

    @IsOptional()
    reward_amount?: number;

    @IsOptional()
    discount?: number;
}