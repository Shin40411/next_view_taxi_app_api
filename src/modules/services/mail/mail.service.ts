import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SettingsService } from '../settings/settings.service';

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

    async sendWelcomeEmail(to: string, customerName: string) {
        const settings = await this.settingsService.getSettings();

        if (!settings?.mail_host || !settings?.mail_user || !settings?.mail_pass) {
            this.logger.warn('Mail configuration is missing. Skipping welcome email.');
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
            subject: 'Chào mừng bạn đến với Goxu.vn!',
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; padding: 40px 0;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        
                        <div style="padding: 40px 40px 20px 40px; text-align: center;">
                            <h1 style="color: #333333; margin-bottom: 30px; font-size: 24px;">Đăng ký thành công!</h1>
                            <img src="https://goxu.vn/logo/goxuvn.png" alt="Welcome Icon" style="width: 80px; height: 80px; margin-bottom: 20px;">
                        </div>

                        <div style="padding: 0 40px 30px 40px; color: #555555; line-height: 1.6;">
                            <h2 style="font-size: 18px; color: #333; margin-bottom: 20px;">Xin chào ${customerName},</h2>
                            
                            <p style="margin-bottom: 15px;">Cảm ơn bạn đã đăng ký tài khoản và sử dụng dịch vụ tại <strong>Goxu.vn</strong>!</p>
                            
                            <div style="text-align: center; margin: 35px 0;">
                                <a href="https://goxu.vn/" style="background-color: #FFC107; color: #000000; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">ĐĂNG NHẬP VÀO TÀI KHOẢN CỦA BẠN</a>
                            </div>

                            <p style="margin-bottom: 5px;"><strong>Bạn có câu hỏi?</strong></p>
                            <p style="margin-bottom: 0;">Vui lòng liên hệ hỗ trợ với hotline: <tel>0763 800 763</tel>.</p>
                        </div>

                        <div style="background-color: #f9f9f9; padding: 20px 40px; text-align: center; font-size: 12px; color: #999999;">
                            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Goxu.vn. All rights reserved.</p>
                            <p style="margin: 5px 0 0 0;">Bạn nhận được email này vì bạn đã đăng ký tài khoản tại Goxu.vn.</p>
                        </div>

                    </div>
                </div>
            `,
        };

        try {
            await transporter.sendMail(mailOptions);
            this.logger.log(`Welcome email sent to: ${to}`);
        } catch (error) {
            this.logger.error(`Failed to send welcome email to ${to}`, error.stack);
        }
    }

    async sendProfileReminderEmail(to: string, customerName: string, missingFields: string[]) {
        const settings = await this.settingsService.getSettings();

        if (!settings?.mail_host || !settings?.mail_user || !settings?.mail_pass) {
            this.logger.warn('Mail configuration is missing. Skipping profile reminder email.');
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

        const missingStepsCount = missingFields.length;
        const missingFieldsHtml = missingFields.map(field => `<li>${field}</li>`).join('');

        const mailOptions = {
            from: settings.mail_from || '"Goxu.vn" <no-reply@goxu.vn>',
            to: to,
            subject: `Bạn còn ${missingStepsCount} bước chưa hoàn thành - Goxu.vn`,
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; padding: 40px 0;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        
                        <div style="padding: 40px 40px 20px 40px; text-align: center;">
                            <h1 style="color: #333333; margin-bottom: 10px; font-size: 24px;">Hoàn tất hồ sơ của bạn</h1>
                            <img src="https://goxu.vn/logo/favicon/web-app-manifest-512x512.png" alt="Goxu Logo" style="width: 80px; height: 80px; margin-bottom: 20px;">
                        </div>

                        <div style="padding: 0 40px 30px 40px; color: #555555; line-height: 1.6;">
                            <h2 style="font-size: 18px; color: #333; margin-bottom: 20px;">Xin chào ${customerName},</h2>
                            
                            <p style="margin-bottom: 15px;">Chúng tôi nhận thấy hồ sơ đăng ký của bạn tại <strong>Goxu.vn</strong> vẫn chưa hoàn tất.</p>
                            <p style="margin-bottom: 15px;">Bạn còn <strong>${missingStepsCount} bước</strong> cần hoàn thành:</p>
                            
                            <ul style="margin-bottom: 25px; padding-left: 20px; color: #d32f2f;">
                                ${missingFieldsHtml}
                            </ul>

                            <p style="margin-bottom: 25px;">Việc hoàn tất hồ sơ sẽ giúp bạn sớm được duyệt tài khoản và bắt đầu hoạt động cùng Goxu.</p>
                            
                            <div style="text-align: center; margin: 35px 0;">
                                <a href="https://goxu.vn/" style="background-color: #FFC107; color: #000000; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">CẬP NHẬT HỒ SƠ NGAY</a>
                            </div>

                            <p style="margin-bottom: 5px;"><strong>Bạn cần hỗ trợ?</strong></p>
                            <p style="margin-bottom: 0;">Vui lòng liên hệ hotline: <a href="tel:0763800763" style="color: #007bff; text-decoration: none;">0763.800.763</a>.</p>
                        </div>

                        <div style="background-color: #f9f9f9; padding: 20px 40px; text-align: center; font-size: 12px; color: #999999;">
                            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Goxu.vn. All rights reserved.</p>
                            <p style="margin: 5px 0 0 0;">Email này được gửi tự động, vui lòng không trả lời.</p>
                        </div>

                    </div>
                </div>
            `,
        };

        try {
            await transporter.sendMail(mailOptions);
            this.logger.log(`Profile reminder email sent to: ${to}`);
        } catch (error) {
            this.logger.error(`Failed to send profile reminder email to ${to}`, error.stack);
        }
    }
}
