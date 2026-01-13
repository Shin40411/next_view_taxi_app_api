import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import Redis from 'ioredis';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class ZaloService {
    constructor(
        @Inject('REDIS_CLIENT') private readonly redis: Redis,
        private configService: ConfigService,
        private settingsService: SettingsService
    ) { }

    async sendZns(phoneNumber: string, templateId: string, templateData: any, retryLevel = 0) {
        let accessToken = '';

        try {
            if (retryLevel === 0) {
                accessToken = await this.getAccessToken();
            } else if (retryLevel === 1) {
                console.log('Token Redis không hoạt động, thử sử dụng Token từ Settings DB...');
                await this.redis.del('zalo:access_token');
                const settings = await this.settingsService.getSettings();
                accessToken = settings?.zalo_access_token || '';
                if (!accessToken) {
                    return this.sendZns(phoneNumber, templateId, templateData, 2);
                }
            } else if (retryLevel === 2) {
                console.log('Token DB không hoạt động, đang thử refresh token...');
                accessToken = await this.refreshAccessToken();
            }
        } catch (error) {
            console.error('Error getting access token during retry:', error.message);
            if (retryLevel < 2) {
                return this.sendZns(phoneNumber, templateId, templateData, retryLevel + 1);
            }
            return;
        }

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
                console.log('Error Code:', response.data.error, response.data.message);

                if ((response.data.error === -216 || response.data.error === -201 || response.data.error === -124) && retryLevel < 2) {
                    console.log(`Token lỗi (-124/-201/-216), thử lại cấp độ ${retryLevel + 1}...`);
                    return this.sendZns(phoneNumber, templateId, templateData, retryLevel + 1);
                }
                console.log('Lỗi gửi mã xác thực về zalo');
            }

            return response.data;
        } catch (error) {
            console.error(error);
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
            const settings = await this.settingsService.getSettings();
            const envToken = settings?.zalo_access_token;
            if (envToken) {
                await this.redis.set('zalo:access_token', envToken, 'EX', 3600);
                return envToken;
            }
            throw e;
        }
    }

    private async refreshAccessToken(): Promise<string> {
        let refreshToken = await this.redis.get('zalo:refresh_token');
        const settings = await this.settingsService.getSettings();

        if (!refreshToken) {
            refreshToken = settings?.zalo_refresh_token || null;
        }

        if (!refreshToken) {
            throw new BadRequestException('Không tìm thấy Refresh Token');
        }

        const appId = settings?.zalo_app_id;
        const secretKey = settings?.zalo_secret_key;

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
                // Also update DB
                await this.settingsService.updateSettings({ zalo_access_token: access_token });
            }

            if (refresh_token) {
                await this.redis.set('zalo:refresh_token', refresh_token, 'EX', 30 * 24 * 60 * 60);
                // Also update DB
                await this.settingsService.updateSettings({ zalo_refresh_token: refresh_token });
                console.log('Đã cập nhật Refresh Token mới vào Redis và DB');
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