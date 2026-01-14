import { Module } from '@nestjs/common';
import { MailService } from '../services/mail/mail.service';
import { SettingsModule } from './settings.module';

@Module({
    imports: [SettingsModule],
    providers: [MailService],
    exports: [MailService],
})
export class MailModule { }
