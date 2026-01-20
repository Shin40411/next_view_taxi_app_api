import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Setting } from 'src/entities/setting.entity';
import { PushNotificationSetting } from 'src/entities/push-notification-setting.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SettingsService {
    constructor(
        @InjectRepository(Setting)
        private settingsRepository: Repository<Setting>,
        @InjectRepository(PushNotificationSetting)
        private pushNotificationRepository: Repository<PushNotificationSetting>,
    ) { }

    async getSettings(): Promise<Setting & PushNotificationSetting> {
        let settings = await this.settingsRepository.findOne({ where: { id: 1 } });
        if (!settings) {
            settings = this.settingsRepository.create({ id: 1 });
            await this.settingsRepository.save(settings);
        }

        let pushSettings = await this.pushNotificationRepository.findOne({ where: { id: 1 } });
        if (!pushSettings) {
            pushSettings = this.pushNotificationRepository.create({ id: 1 });
            await this.pushNotificationRepository.save(pushSettings);
        }

        return { ...settings, ...pushSettings };
    }

    async updateSettings(data: Partial<Setting & PushNotificationSetting>): Promise<Setting & PushNotificationSetting> {
        const settingColumns = this.settingsRepository.metadata.columns.map(c => c.propertyName);
        const pushColumns = this.pushNotificationRepository.metadata.columns.map(c => c.propertyName);

        const settingData: any = {};
        const pushData: any = {};

        Object.keys(data).forEach(key => {
            if (settingColumns.includes(key)) {
                settingData[key] = data[key as keyof (Setting & PushNotificationSetting)];
            }
            if (pushColumns.includes(key)) {
                pushData[key] = data[key as keyof (Setting & PushNotificationSetting)];
            }
        });

        if (Object.keys(settingData).length > 0) {
            let settings = await this.settingsRepository.findOne({ where: { id: 1 } });
            if (!settings) {
                settings = this.settingsRepository.create({ id: 1 });
            }
            Object.assign(settings, settingData);
            await this.settingsRepository.save(settings);
        }

        if (Object.keys(pushData).length > 0) {
            let pushSettings = await this.pushNotificationRepository.findOne({ where: { id: 1 } });
            if (!pushSettings) {
                pushSettings = this.pushNotificationRepository.create({ id: 1 });
            }
            Object.assign(pushSettings, pushData);
            await this.pushNotificationRepository.save(pushSettings);
        }

        return this.getSettings();
    }
}
