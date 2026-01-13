import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Setting } from 'src/entities/setting.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SettingsService {
    constructor(
        @InjectRepository(Setting)
        private settingsRepository: Repository<Setting>,
    ) { }

    async getSettings(): Promise<Setting> {
        let settings = await this.settingsRepository.findOne({ where: { id: 1 } });
        if (!settings) {
            settings = this.settingsRepository.create({ id: 1 });
            await this.settingsRepository.save(settings);
        }
        return settings;
    }

    async updateSettings(data: Partial<Setting>): Promise<Setting> {
        let settings = await this.getSettings();
        Object.assign(settings, data);
        return this.settingsRepository.save(settings);
    }
}
