import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from '../services/chat/chat.service';
import { CreateMessageDto } from '../dtos/create-message.dto';

@WebSocketGateway({ cors: true })
export class ChatGateway {
    @WebSocketServer()
    server: Server;

    constructor(private readonly chatService: ChatService) { }

    @SubscribeMessage('join_room')
    handleJoinRoom(@MessageBody('conversationId') conversationId: string, @ConnectedSocket() client: Socket) {
        client.join(conversationId);
        console.log(`Client ${client.id} joined room ${conversationId}`);
    }

    @SubscribeMessage('leave_room')
    handleLeaveRoom(@MessageBody('conversationId') conversationId: string, @ConnectedSocket() client: Socket) {
        client.leave(conversationId);
        console.log(`Client ${client.id} left room ${conversationId}`);
    }

    @SubscribeMessage('subscribe_all')
    async handleSubscribeAll(@MessageBody('userId') userId: string, @ConnectedSocket() client: Socket) {
        console.log(`Received subscribe_all request from Client ${client.id} for User ${userId}`);
        client.join(`user:${userId}`);
        const conversations = await this.chatService.getConversations(userId);
        conversations.map(c => client.join(c.id));
        console.log(`Client ${client.id} (User ${userId}) subscribed to personal room and ${conversations.length} conversations`);
    }

    @SubscribeMessage('send_message')
    async handleSendMessage(@MessageBody() payload: { conversationId: string, userId: string, body: string }, @ConnectedSocket() client: Socket) {
        const { conversationId, userId, body } = payload;

        const dto = new CreateMessageDto();
        dto.body = body;
        const message = await this.chatService.createMessage(conversationId, userId, dto);

        this.server.to(conversationId).emit('receive_message', message);

        return message;
    }

    @SubscribeMessage('typing')
    handleTyping(@MessageBody() payload: { conversationId: string, userId: string, isTyping: boolean }, @ConnectedSocket() client: Socket) {
        this.server.to(payload.conversationId).emit('typing', payload);
    }

    @SubscribeMessage('mark_as_read')
    async handleMarkAsRead(@MessageBody() payload: { conversationId: string, userId: string }, @ConnectedSocket() client: Socket) {
        await this.chatService.markAsRead(payload.conversationId, payload.userId);
        this.server.to(payload.conversationId).emit('message_read', { conversationId: payload.conversationId, userId: payload.userId });
    }
}
