import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from '../services/tasks/tasks.service';
import { User } from '../../entities/user.entity';
import { Contract } from '../../entities/contract.entity';
import { MailModule } from './mail.module';
import { SettingsModule } from './settings.module';
import { AdminModule } from './admin.module';
import { ReportModule } from './report.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Contract]),
        MailModule,
        SettingsModule,
        AdminModule,
        ReportModule,
    ],
    providers: [TasksService],
    exports: [TasksService],
})
export class TasksModule { }
