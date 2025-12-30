import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ZaloService {
    private readonly tokenFilePath = path.resolve('zalo-tokens.json');

    constructor(private configService: ConfigService) { }

    async sendZns(phoneNumber: string, templateId: string, templateData: any) {
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
                if (response.data.error === -216 || response.data.error === -201) {
                    await this.refreshAccessToken();
                    return this.sendZns(phoneNumber, templateId, templateData);
                }
                throw new BadRequestException(response.data.message);
            }

            return response.data;
        } catch (error) {
            throw new BadRequestException('Lỗi gửi tin nhắn Zalo');
        }
    }

    private async getAccessToken(): Promise<string> {
        if (fs.existsSync(this.tokenFilePath)) {
            const data = fs.readFileSync(this.tokenFilePath, 'utf8');
            const tokens = JSON.parse(data);
            return tokens.access_token;
        }
        return await this.refreshAccessToken();
    }

    private async refreshAccessToken(): Promise<string> {
        let refreshToken = this.configService.get<string>('ZALO_REFRESH_TOKEN');

        if (fs.existsSync(this.tokenFilePath)) {
            const data = fs.readFileSync(this.tokenFilePath, 'utf8');
            const tokens = JSON.parse(data);
            if (tokens.refresh_token) {
                refreshToken = tokens.refresh_token;
            }
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

            const { access_token, refresh_token } = response.data;

            fs.writeFileSync(this.tokenFilePath, JSON.stringify({
                access_token,
                refresh_token
            }));

            return access_token;
        } catch (error) {
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