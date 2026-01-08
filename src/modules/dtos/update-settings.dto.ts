import { IsOptional, IsString, MaxLength, IsNumber } from 'class-validator';

export class UpdateSettingsDto {
    @IsOptional()
    @IsString()
    @MaxLength(255)
    google_client_id?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    google_client_secret?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    google_callback_url?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    zalo_app_id?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    zalo_secret_key?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    zalo_template_id_otp?: string;

    @IsOptional()
    @IsString()
    @MaxLength(5000)
    zalo_access_token?: string;

    @IsOptional()
    @IsString()
    @MaxLength(5000)
    zalo_refresh_token?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    mail_host?: string;

    @IsOptional()
    @IsNumber()
    mail_port?: number;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    mail_user?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    mail_pass?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    mail_from?: string;
}
