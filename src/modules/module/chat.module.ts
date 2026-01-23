import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from '../services/chat/chat.service';
import { ChatController } from '../controller/chat/chat.controller';
import { ChatGateway } from '../socket/chat.gateway';
import { Conversation } from '../../entities/conversation.entity';
import { Message } from '../../entities/message.entity';
import { ChatParticipant } from '../../entities/chat-participant.entity';
import { User } from '../../entities/user.entity';
import { AuthModule } from './auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Conversation, Message, ChatParticipant, User]),
        AuthModule
    ],
    controllers: [ChatController],
    providers: [ChatService, ChatGateway],
    exports: [ChatService],
})
export class ChatModule { }
