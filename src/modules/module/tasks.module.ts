import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from '../services/tasks/tasks.service';
import { User } from '../../entities/user.entity';
import { MailModule } from './mail.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        MailModule,
    ],
    providers: [TasksService],
    exports: [TasksService],
})
export class TasksModule { }
