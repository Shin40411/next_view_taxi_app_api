import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket } from 'src/entities/support-ticket.entity';
import { User } from 'src/entities/user.entity';
import { SupportController } from 'src/modules/controller/support/support.controller';
import { SupportService } from 'src/modules/services/support/support.service';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([SupportTicket, User]),
        AuthModule
    ],
    controllers: [SupportController],
    providers: [SupportService],
})
export class SupportModule { }
