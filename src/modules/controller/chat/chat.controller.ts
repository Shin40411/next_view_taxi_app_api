import { Controller, Get, UseGuards, Request, Post, Body, Delete, Param, Query, ParseUUIDPipe, Patch } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from '../../services/chat/chat.service';
import { CreateMessageDto } from '../../dtos/create-message.dto';
import { AuthGuard } from 'src/modules/auth/guards/auth.guard';
import { SafeThrottlerGuard } from 'src/common/guards/safe-throttler.guard';

import { ChatGateway } from '../../socket/chat.gateway';

@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
    constructor(
        private readonly chatService: ChatService,
        private readonly chatGateway: ChatGateway
    ) { }

    @Get('conversations')
    // @Throttle({ default: { limit: 30, ttl: 60000 } })
    async getConversations(@Request() req) {
        return this.chatService.getConversations(req.user.sub);
    }

    @Get('conversations/:id')
    // @Throttle({ default: { limit: 30, ttl: 60000 } })
    async getConversationDetail(@Request() req, @Param('id') id: string) {
        return this.chatService.getConversationDetail(id, req.user.sub);
    }

    @Get('total-unread')
    // @Throttle({ default: { limit: 30, ttl: 60000 } })
    async getTotalUnread(@Request() req) {
        return this.chatService.getTotalUnread(req.user.sub);
    }

    @Get(':id/messages')
    // @Throttle({ default: { limit: 30, ttl: 60000 } })
    async getMessages(@Param('id', ParseUUIDPipe) id: string, @Request() req, @Query('limit') limit: number) {
        return this.chatService.getMessages(id, req.user.sub, limit);
    }

    @Post('create')
    async createConversation(@Request() req, @Body('partnerId') partnerId: string) {
        return this.chatService.createConversation(req.user.sub, partnerId);
    }

    @Post(':id/messages')
    async createMessage(@Param('id', ParseUUIDPipe) id: string, @Request() req, @Body() createMessageDto: CreateMessageDto) {
        const message = await this.chatService.createMessage(id, req.user.sub, createMessageDto);
        this.chatGateway.server.to(id).emit('receive_message', message);
        return message;
    }

    @Delete(':id')
    async deleteConversation(@Param('id') id: string, @Request() req) {
        return this.chatService.deleteConversationForUser(id, req.user.sub);
    }

    @Patch(':id/read')
    async markAsRead(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
        await this.chatService.markAsRead(id, req.user.sub);
        this.chatGateway.server.to(id).emit('message_read', { conversationId: id, userId: req.user.sub });
        return;
    }
}
