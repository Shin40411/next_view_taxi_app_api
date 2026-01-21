import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { User } from '../../../entities/user.entity';
import { MailService } from '../mail/mail.service';
import { SettingsService } from '../settings/settings.service';
import moment from 'moment-timezone';
import { AdminService } from '../admin/admin.service';
import { ReportService } from '../report/report.service';
import { UserRole } from '../../../utils/user-role.enum';
import { PartnerStatus } from '../../../utils/partner-status.enum';
import { Contract } from '../../../entities/contract.entity';
import { ContractStatus } from '../../../utils/contract-status.enum';

@Injectable()
export class TasksService {
    private readonly logger = new Logger(TasksService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Contract)
        private readonly contractRepository: Repository<Contract>,
        private readonly mailService: MailService,
        private readonly settingsService: SettingsService,
        private readonly adminService: AdminService,
        private readonly reportService: ReportService,
    ) { }

    @Cron(CronExpression.EVERY_MINUTE)
    async handleReportMail() {
        const settings = await this.settingsService.getSettings();
        if (!settings?.send_report_mail || !settings?.time_report_mail || !settings?.email_receive) {
            return;
        }

        const now = moment().tz('Asia/Ho_Chi_Minh');
        const currentMinute = now.minutes();
        const currentHour = now.hours();
        const currentDay = now.day();

        const parts = settings.time_report_mail.split(' ');
        if (parts.length < 3) return;

        const scheduledMinute = parseInt(parts[1], 10);
        const scheduledHour = parseInt(parts[2], 10);

        if (currentDay !== 0 || currentMinute !== scheduledMinute || currentHour !== scheduledHour) {
            return;
        }

        this.logger.log(`Running weekly report mail task at ${currentHour}:${currentMinute} (Sunday)...`);

        try {
            const range = '7_last_days';
            const partnerStats = await this.adminService.getPartnerStats(range, 1, 0);
            const spStats = await this.adminService.getServicePointStats(range, 1, 0);
            const attachments: { filename: string, content: Buffer }[] = [];

            if (partnerStats?.data?.length > 0) {
                const buffer = await this.reportService.generatePartnerReport(partnerStats.data);
                attachments.push({
                    filename: `BaoCao_TaiXe_${now.format('YYYY-MM-DD')}.xlsx`,
                    content: buffer
                });
            }

            if (spStats?.data?.length > 0) {
                const buffer = await this.reportService.generateServicePointReport(spStats.data);
                attachments.push({
                    filename: `BaoCao_DiemDichVu_${now.format('YYYY-MM-DD')}.xlsx`,
                    content: buffer
                });
            }

            if (attachments.length > 0) {
                await this.mailService.sendReportEmail(attachments);
                this.logger.log(`Sent report email to ${settings.email_receive} with ${attachments.length} attachments.`);
            } else {
                this.logger.log('No data to report.');
            }

        } catch (error) {
            this.logger.error('Error running report mail task', error.stack);
        }
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async handleProfileReminder() {
        const settings = await this.settingsService.getSettings();
        if (!settings?.send_reminder_mail || !settings?.time_reminder_mail) {
            return;
        }

        const now = moment().tz('Asia/Ho_Chi_Minh');
        const currentMinute = now.minutes();
        const currentHour = now.hours();

        const parts = settings.time_reminder_mail.split(' ');
        if (parts.length < 3) return;

        const scheduledMinute = parseInt(parts[1], 10);
        const scheduledHour = parseInt(parts[2], 10);

        if (currentMinute !== scheduledMinute || currentHour !== scheduledHour) {
            return;
        }

        this.logger.log(`Running daily profile reminder task at ${currentHour}:${currentMinute}...`);

        try {
            const users = await this.userRepository.find({
                where: [
                    { role: UserRole.PARTNER, isDelete: false },
                    { role: UserRole.INTRODUCER, isDelete: false }
                ],
                relations: ['partnerProfile'],
            });

            for (const user of users) {
                if (!user.partnerProfile) continue;

                if (user.partnerProfile.status === PartnerStatus.APPROVED) continue;
                if (user.partnerProfile.status === PartnerStatus.REJECTED) continue;

                const missingFields: string[] = [];
                if (!user.email) missingFields.push('Email');
                if (!user.phone_number) missingFields.push('Số điện thoại');

                if (!user.partnerProfile.id_card_num) missingFields.push('Số CCCD');
                if (!user.partnerProfile.id_card_front) missingFields.push('Ảnh mặt trước CCCD');
                if (!user.partnerProfile.id_card_back) missingFields.push('Ảnh mặt sau CCCD');
                if (!user.partnerProfile.date_of_birth) missingFields.push('Ngày sinh');
                if (!user.partnerProfile.sex) missingFields.push('Giới tính');

                if (user.role === UserRole.PARTNER) {
                    if (!user.partnerProfile.vehicle_plate) missingFields.push('Biển số xe');
                    if (!user.partnerProfile.brand) missingFields.push('Hãng taxi');
                    if (!user.partnerProfile.driver_license_front) missingFields.push('Ảnh mặt trước bằng lái');
                    if (!user.partnerProfile.driver_license_back) missingFields.push('Ảnh mặt sau bằng lái');
                }

                if (missingFields.length > 0) {
                    if (user.email) {
                        this.logger.log(`Sending reminder to ${user.email} (Missing: ${missingFields.join(', ')})`);
                        await this.mailService.sendProfileReminderEmail(user.email, user.full_name, missingFields);
                    } else {
                        this.logger.warn(`User ${user.id} has missing fields but no email to send reminder.`);
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error running profile reminder task', error.stack);
        }
    }

    @Cron(CronExpression.EVERY_WEEK)
    async handleWeeklyContractExp() {
        this.logger.log('Running weekly contract expiration check...');

        try {
            const now = new Date();
            const expiredContracts = await this.contractRepository.createQueryBuilder('contract')
                .leftJoinAndSelect('contract.user', 'user')
                .where('contract.status = :status', { status: ContractStatus.ACTIVE })
                .andWhere('contract.expire_date < :now', { now })
                .getMany();

            if (expiredContracts.length === 0) {
                this.logger.log('No expired contracts found.');
                return;
            }

            this.logger.log(`Found ${expiredContracts.length} expired contracts.`);

            for (const contract of expiredContracts) {
                if (contract.user && contract.user.email) {
                    try {
                        await this.mailService.sendExpiredContract(
                            contract.user.email,
                            contract.full_name,
                            contract.expire_date
                        );
                        this.logger.log(`Sent expired contract email to ${contract.user.email}`);

                    } catch (err) {
                        this.logger.error(`Failed to send email for contract ${contract.id}`, err.stack);
                    }
                }
            }

        } catch (error) {
            this.logger.error('Error running weekly contract expiration check', error.stack);
        }
    }
}
