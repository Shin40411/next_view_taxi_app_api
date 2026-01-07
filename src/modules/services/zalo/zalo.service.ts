import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import Redis from 'ioredis';

@Injectable()
export class ZaloService {
    constructor(
        @Inject('REDIS_CLIENT') private readonly redis: Redis,
        private configService: ConfigService
    ) { }

    async sendZns(phoneNumber: string, templateId: string, templateData: any, isRetry = false) {
        const accessToken = await this.getAccessToken();
        const formattedPhone = this.formatPhone(phoneNumber);

        try {
            const response = await axios.post(
                'https://business.openapi.zalo.me/message/template',
                {
                    phone: formattedPhone,
                    template_id: templateId,
                    template_data: templateData,
                    tracking_id: `tracking_${Date.now()}`
                },
                {
                    headers: {
                        access_token: accessToken,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.error !== 0) {
                console.log(formattedPhone, templateId, templateData);
                console.log(accessToken);
                if ((response.data.error === -216 || response.data.error === -201 || response.data.error === -124) && !isRetry) {
                    console.log('Token hết hạn hoặc không hợp lệ (-124/-201/-216), đang thử làm mới...');
                    try {
                        await this.refreshAccessToken();
                        return this.sendZns(phoneNumber, templateId, templateData, true);
                    } catch (refreshError) {
                        console.error("Lỗi khi cố refresh token:", refreshError);
                        throw new BadRequestException('Hết phiên đăng nhập Zalo, vui lòng liên hệ Admin');
                    }
                }
                throw new BadRequestException('Lỗi gửi mã xác thực về zalo, vui lòng liên hệ quản trị viên');
            }

            return response.data;
        } catch (error) {
            console.error(error);
            throw new BadRequestException('Lỗi gửi tin nhắn Zalo');
        }
    }

    private async getAccessToken(): Promise<string> {
        const cachedToken = await this.redis.get('zalo:access_token');
        if (cachedToken) {
            return cachedToken;
        }

        try {
            return await this.refreshAccessToken();
        } catch (e) {
            console.warn('Refresh failed, falling back to Env Access Token if available');
            const envToken = this.configService.get<string>('ZALO_ACCESS_TOKEN');
            if (envToken) {
                await this.redis.set('zalo:access_token', envToken, 'EX', 3600);
                return envToken;
            }
            throw e;
        }
    }

    private async refreshAccessToken(): Promise<string> {
        let refreshToken = await this.redis.get('zalo:refresh_token');
        if (!refreshToken) {
            refreshToken = this.configService.get<string>('ZALO_REFRESH_TOKEN') || null;
        }

        if (!refreshToken) {
            throw new BadRequestException('Không tìm thấy Refresh Token');
        }

        const appId = this.configService.get<string>('ZALO_APP_ID');
        const secretKey = this.configService.get<string>('ZALO_SECRET_KEY');

        try {
            const response = await axios.post(
                'https://oauth.zaloapp.com/v4/access_token',
                new URLSearchParams({
                    app_id: appId ?? '',
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                }),
                {
                    headers: {
                        secret_key: secretKey,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            const { access_token, refresh_token, expires_in, error_name, error_description } = response.data;

            if (error_name || !access_token) {
                console.error('Zalo OAuth Error:', response.data);
                console.log(error_description);
                throw new Error('Lỗi khi lấy access token từ Zalo');
            }

            console.log('Đã refresh Access Token thành công!');

            if (access_token) {
                const expiresInProp = expires_in ? parseInt(expires_in) - 60 : 3600;
                await this.redis.set('zalo:access_token', access_token, 'EX', expiresInProp);
            }

            if (refresh_token) {
                await this.redis.set('zalo:refresh_token', refresh_token, 'EX', 30 * 24 * 60 * 60);
                console.log('Đã cập nhật Refresh Token mới vào Redis');
            }

            return access_token;
        } catch (error) {
            console.error('Refresh Token Failed Details:', error?.response?.data || error.message);
            throw new BadRequestException('Không thể làm mới Zalo Token');
        }
    }

    private formatPhone(phone: string): string {
        if (phone.startsWith('0')) {
            return '84' + phone.substring(1);
        }
        return phone;
    }
}