import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SettingsService } from 'src/modules/settings/settings.service';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    constructor(private readonly settingsService: SettingsService) { }

    async sendOtp(to: string, otp: string, customerName: string) {
        const settings = await this.settingsService.getSettings();

        if (!settings?.mail_host || !settings?.mail_user || !settings?.mail_pass) {
            this.logger.warn('Mail configuration is missing. Skipping email OTP.');
            return;
        }

        const transporter = nodemailer.createTransport({
            host: settings.mail_host,
            port: settings.mail_port || 587,
            secure: settings.mail_port === 465,
            auth: {
                user: settings.mail_user,
                pass: settings.mail_pass,
            },
        });

        const mailOptions = {
            from: settings.mail_from || '"Goxu.vn" <no-reply@goxu.vn>',
            to: to,
            subject: 'Mã OTP xác thực - Goxu.vn',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Xin chào ${customerName},</h2>
                    <p>Mã xác thực (OTP) của bạn là:</p>
                    <h1 style="color: #FFC107; letter-spacing: 5px;">${otp}</h1>
                    <p>Mã này sẽ hết hạn trong 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
                    <br>
                    <p>Trân trọng,</p>
                    <p>Đội ngũ Goxu.vn</p>
                </div>
            `,
        };

        try {
            await transporter.sendMail(mailOptions);
            this.logger.log(`OTP sent to email: ${to}`);
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}`, error.stack);
        }
    }
}
