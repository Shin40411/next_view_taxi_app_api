import { Controller, Post, Body, UseGuards, Request, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { RegisterDto } from 'src/modules/dtos';
import { AuthService } from 'src/modules/services/auth/auth.service';
import { AuthGuard } from 'src/modules/auth/auth.guard';

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

    @Post('login')
    async login(@Body() body: any) {
        return this.authService.login(body.username, body.password);
    }

    @Post('logout')
    @UseGuards(AuthGuard)
    async logout(@Request() req) {
        return this.authService.logout(req.user.sub);
    }
}