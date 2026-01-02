import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from 'src/entities/notification.entity';
import { User } from 'src/entities/user.entity';
import { NotificationService } from '../services/notification/notification.service';
import { NotificationController } from '../controller/notification/notification.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Notification, User]),
        AuthModule
    ],
    providers: [NotificationService],
    controllers: [NotificationController],
    exports: [NotificationService],
})
export class NotificationModule { }
