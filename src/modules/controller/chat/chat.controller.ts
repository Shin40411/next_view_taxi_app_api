import { Controller, Get, UseGuards, Request, Post, Body, Delete, Param, Query, ParseUUIDPipe, Patch } from '@nestjs/common';
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

    @Post('create')
    async createConversation(@Request() req, @Body('partnerId') partnerId: string) {
        return this.chatService.createConversation(req.user.sub, partnerId);
    }

    @Delete(':id')
    async deleteConversation(@Param('id') id: string) {
        return this.chatService.deleteConversation(id);
    }

    @Get(':id/messages')
    async getMessages(@Param('id', ParseUUIDPipe) id: string, @Query('limit') limit: number) {
        return this.chatService.getMessages(id, limit);
    }

    @Post(':id/messages')
    async createMessage(@Param('id', ParseUUIDPipe) id: string, @Request() req, @Body() createMessageDto: CreateMessageDto) {
        const message = await this.chatService.createMessage(id, req.user.sub, createMessageDto);
        this.chatGateway.server.to(id).emit('receive_message', message);
        return message;
    }

    @Patch(':id/read')
    async markAsRead(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
        await this.chatService.markAsRead(id, req.user.sub);
        this.chatGateway.server.to(id).emit('message_read', { conversationId: id, userId: req.user.sub });
        return;
    }
}
