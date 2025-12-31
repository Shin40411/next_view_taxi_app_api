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
                if ((response.data.error === -216 || response.data.error === -201) && !isRetry) {
                    await this.refreshAccessToken();
                    console.log('Token hết hạn, đang thử làm mới...');
                    return this.sendZns(phoneNumber, templateId, templateData, true);
                }
                throw new BadRequestException(response.data.message || 'Lỗi gửi ZNS');
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
        return await this.refreshAccessToken();
    }

    private async refreshAccessToken(): Promise<string> {
        let refreshToken = await this.redis.get('zalo:refresh_token');

        if (!refreshToken) {
            refreshToken = this.configService.get<string>('ZALO_REFRESH_TOKEN') || null;
        }

        const appId = this.configService.get<string>('ZALO_APP_ID');
        const secretKey = this.configService.get<string>('ZALO_SECRET_KEY');

        try {
            const response = await axios.post(
                'https://oauth.zaloapp.com/v4/access_token',
                new URLSearchParams({
                    app_id: appId ?? '',
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken ?? ''
                }),
                {
                    headers: {
                        secret_key: secretKey,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            const { access_token, refresh_token, expires_in } = response.data;

            if (access_token) {
                const expiresInProp = expires_in ? parseInt(expires_in) - 60 : 3600;
                await this.redis.set('zalo:access_token', access_token, 'EX', expiresInProp);
            }
            if (refresh_token) {
                await this.redis.set('zalo:refresh_token', refresh_token, 'EX', 30 * 24 * 60 * 60);
            }

            return access_token;
        } catch (error) {
            console.error('Refresh Token Error:', error?.response?.data || error.message);
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