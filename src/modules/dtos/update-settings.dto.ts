import { IsOptional, IsString, MaxLength, IsNumber, IsBoolean } from 'class-validator';

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

    @IsOptional()
    @IsString()
    @MaxLength(255)
    email_receive?: string;

    @IsOptional()
    @IsBoolean()
    send_report_mail?: boolean;

    @IsOptional()
    @IsString()
    time_report_mail?: string;

    @IsOptional()
    @IsBoolean()
    send_reminder_mail?: boolean;

    @IsOptional()
    @IsString()
    time_reminder_mail?: string;

    @IsOptional()
    @IsBoolean()
    receive_support_mail?: boolean;

    @IsOptional()
    @IsString()
    tpl_trip_request?: string;

    @IsOptional()
    @IsString()
    tpl_driver_arrived?: string;

    @IsOptional()
    @IsString()
    tpl_trip_cancelled?: string;

    @IsOptional()
    @IsString()
    tpl_trip_confirmed?: string;

    @IsOptional()
    @IsString()
    tpl_trip_rejected?: string;

    @IsOptional()
    @IsString()
    tpl_wallet_success?: string;

    @IsOptional()
    @IsString()
    tpl_wallet_failed?: string;

    @IsOptional()
    @IsString()
    tpl_contract_approved?: string;

    @IsOptional()
    @IsString()
    tpl_contract_terminated?: string;
}
