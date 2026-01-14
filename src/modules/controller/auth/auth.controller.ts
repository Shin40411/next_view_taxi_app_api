import { Controller, Post, Body, UseGuards, Request, UseInterceptors, UploadedFiles, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { RegisterDto, ChangePasswordDto } from 'src/modules/dtos/register-user.dto';
import { LoginDto } from 'src/modules/dtos/login.dto';
import { AuthService } from 'src/modules/services/auth/auth.service';
import { AuthGuard } from 'src/modules/auth/guards/auth.guard';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { GoogleAuthGuard } from 'src/modules/auth/guards/google-auth.guard';
import { ForgotPasswordDto, VerifyOtpDto, ResetPasswordDto } from 'src/modules/dtos/forgot-password.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'id_card_front', maxCount: 1 },
        { name: 'id_card_back', maxCount: 1 },
        { name: 'driver_license_front', maxCount: 1 },
        { name: 'driver_license_back', maxCount: 1 },
    ], {
        storage: diskStorage({
            destination: (req, file, cb) => {
                if (file.fieldname.startsWith('driver_license')) {
                    cb(null, './uploads/driver_license');
                } else {
                    cb(null, './uploads/partners');
                }
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const ext = extname(file.originalname);
                cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
            },
        }),
    }))
    async register(
        @Body() body: RegisterDto,
        @UploadedFiles() files: {
            id_card_front?: Express.Multer.File[],
            id_card_back?: Express.Multer.File[],
            driver_license_front?: Express.Multer.File[],
            driver_license_back?: Express.Multer.File[]
        },
    ) {
        if (files?.id_card_front?.[0]) {
            body.id_card_front = files.id_card_front[0].path;
        }
        if (files?.id_card_back?.[0]) {
            body.id_card_back = files.id_card_back[0].path;
        }
        if (files?.driver_license_front?.[0]) {
            body.driver_license_front = files.driver_license_front[0].path;
        }
        if (files?.driver_license_back?.[0]) {
            body.driver_license_back = files.driver_license_back[0].path;
        }
        return this.authService.register(body);
    }

    @Post('request-register-otp')
    async requestRegisterOtp(@Body() body: { username: string; email: string; fullName: string }) {
        return this.authService.requestRegisterOtp(body);
    }

    @Post('request-login-otp')
    async requestLoginOtp(@Body() body: { username: string; password: string }) {
        return this.authService.requestLoginOtp(body);
    }

    @Post('login')
    async login(@Body() body: LoginDto & { otp?: string }) {
        return this.authService.login(body.username, body.password, body.otp);
    }

    @Post('logout')
    @UseGuards(AuthGuard)
    async logout(@Request() req) {
        return this.authService.logout(req.user.sub);
    }

    @Post('forgot-password')
    async forgotPassword(@Body() body: ForgotPasswordDto) {
        return this.authService.requestPasswordReset(body.username);
    }

    @Post('verify-otp')
    async verifyOtp(@Body() body: VerifyOtpDto) {
        return this.authService.verifyOtp(body.username, body.otp);
    }

    @Post('reset-password')
    async resetPassword(@Body() body: ResetPasswordDto) {
        return this.authService.confirmPasswordReset(body.username, body.otp, body.newPassword);
    }

    @Post('change-password')
    @UseGuards(AuthGuard)
    async changePassword(@Request() req, @Body() body: ChangePasswordDto) {
        return this.authService.changePassword(req.user.sub, body.oldPassword, body.newPassword);
    }

    @Post('request-contract-otp')
    @UseGuards(AuthGuard)
    async requestContractOtp(@Request() req) {
        return this.authService.requestContractOtp(req.user.sub);
    }

    @Post('verify-contract-otp')
    @UseGuards(AuthGuard)
    async verifyContractOtp(@Request() req, @Body() body: { otp: string }) {
        return this.authService.verifyContractOtp(req.user.sub, body.otp);
    }

    @Get('google')
    @UseGuards(GoogleAuthGuard)
    async googleAuth(@Request() req) { }

    @Get('google/callback')
    @UseGuards(PassportAuthGuard('google'))
    async googleAuthRedirect(@Request() req, @Res() res: Response) {
        try {
            const data = await this.authService.handleGoogleLogin(req.user);
            const frontendUrl = process.env.FRONTEND_URL || 'https://goxu.vn';
            return res.redirect(`${frontendUrl}/auth/jwt/login?accessToken=${data.access_token}&userId=${data.user_id}&role=${data.role}&username=${data.username}&fullName=${encodeURIComponent(data.full_name)}`);
        } catch (error: any) {
            const frontendUrl = process.env.FRONTEND_URL || 'https://goxu.vn';
            const message = error.message || 'Đăng nhập thất bại';
            return res.redirect(`${frontendUrl}/auth/jwt/login?error=${encodeURIComponent(message)}`);
        }
    }
}