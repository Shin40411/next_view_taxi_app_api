import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    username: string;
}

export class VerifyOtpDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    username: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(6)
    otp: string;
}

export class ResetPasswordDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    username: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(6)
    otp: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    @MaxLength(100)
    newPassword: string;
}
