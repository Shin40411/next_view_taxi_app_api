import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { User } from '../../../entities/user.entity';
import { MailService } from '../mail/mail.service';
import { UserRole } from '../../../utils/user-role.enum';
import { PartnerStatus } from '../../../utils/partner-status.enum';

@Injectable()
export class TasksService {
    private readonly logger = new Logger(TasksService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly mailService: MailService,
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_10AM)
    async handleProfileReminder() {
        this.logger.log('Running daily profile reminder task...');

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
}
