import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from '../services/admin/admin.service';
import { User } from '../../entities/user.entity';
import { ServicePoint } from '../../entities/service-point.entity';
import { Trip } from '../../entities/trip.entity';
import { PartnerProfile } from '../../entities/partner-profile.entity';
import { BankAccount } from '../../entities/bank-account.entity';
import { Notification } from '../../entities/notification.entity';
import { Contract } from '../../entities/contract.entity';
import { SupportTicket } from '../../entities/support-ticket.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { PointTransaction } from '../../entities/point-transaction.entity';
import { ChatParticipant } from '../../entities/chat-participant.entity';
import { Message } from '../../entities/message.entity';
import { Conversation } from '../../entities/conversation.entity';
import { SocketModule } from './socket.module';
import { MailModule } from './mail.module';
import { AdminController } from '../controller/admin/admin.controller';
import { SystemAdminController } from '../controller/admin/system-admin.controller';
import { AuthModule } from './auth.module';

import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([
            User,
            ServicePoint,
            Trip,
            PartnerProfile,
            BankAccount,
            Notification,
            Contract,
            SupportTicket,
            WalletTransaction,
            PointTransaction,
            ChatParticipant,
            Message,
            Conversation
        ]),
        SocketModule,
        MailModule,
        AuthModule
    ],
    controllers: [SystemAdminController],
    providers: [AdminService],
    exports: [AdminService],
})
export class AdminModule { }
