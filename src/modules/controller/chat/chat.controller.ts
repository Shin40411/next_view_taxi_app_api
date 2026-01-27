import { Controller, Get, UseGuards, Request, Post, Body, Delete, Param, Query, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ChatService } from '../../services/chat/chat.service';
import { CreateMessageDto } from '../../dtos/create-message.dto';
import { AuthGuard } from 'src/modules/auth/guards/auth.guard';

import { ChatGateway } from '../../socket/chat.gateway';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('chat')
@UseGuards(AuthGuard)
@SkipThrottle()
export class ChatController {
    constructor(
        private readonly chatService: ChatService,
        private readonly chatGateway: ChatGateway
    ) { }

    @Get('conversations')
    async getConversations(@Request() req) {
        return this.chatService.getConversations(req.user.sub);
    }

    @Get('conversations/:id')
    async getConversationDetail(@Request() req, @Param('id') id: string) {
        return this.chatService.getConversationDetail(id, req.user.sub);
    }

    @Get('total-unread')
    async getTotalUnread(@Request() req) {
        return this.chatService.getTotalUnread(req.user.sub);
    }

    @Get(':id/messages')
    async getMessages(@Param('id', ParseUUIDPipe) id: string, @Request() req, @Query('limit') limit: number, @Query('before') before: string, @Query('beforeId') beforeId: string) {
        return this.chatService.getMessages(id, req.user.sub, limit, before, beforeId);
    }

    @Post('create')
    async createConversation(@Request() req, @Body('partnerId') partnerId: string) {
        return this.chatService.createConversation(req.user.sub, partnerId);
    }

    @Post(':id/messages')
    async createMessage(@Param('id', ParseUUIDPipe) id: string, @Request() req, @Body() createMessageDto: CreateMessageDto) {
        const message = await this.chatService.createMessage(id, req.user.sub, createMessageDto);
        const participants = await this.chatService.getParticipantIds(id);
        this.chatGateway.server.to(id).emit('receive_message', message);
        participants.forEach(userId => {
            this.chatGateway.server.to(`user:${userId}`).emit('receive_message', { ...message, conversation_id: id });
        });
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
