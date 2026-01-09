import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket } from 'src/entities/support-ticket.entity';
import { User } from 'src/entities/user.entity';
import { Faq } from 'src/entities/faq.entity';
import { SupportController } from 'src/modules/controller/support/support.controller';
import { SupportService } from 'src/modules/services/support/support.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from 'src/modules/notification/notification.module';


@Module({
    imports: [
        TypeOrmModule.forFeature([SupportTicket, User, Faq]),
        AuthModule,
        NotificationModule
    ],
    controllers: [SupportController],
    providers: [SupportService],
})
export class SupportModule { }
