import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatParticipant } from 'src/entities/chat-participant.entity';
import { Conversation } from 'src/entities/conversation.entity';
import { Message } from 'src/entities/message.entity';
import { CreateMessageDto } from '../../dtos/create-message.dto';
import { Repository } from 'typeorm';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(Conversation)
        private conversationRepository: Repository<Conversation>,
        @InjectRepository(Message)
        private messageRepository: Repository<Message>,
        @InjectRepository(ChatParticipant)
        private chatParticipantRepository: Repository<ChatParticipant>,
    ) { }

    async getConversations(userId: string) {
        const participations = await this.chatParticipantRepository.find({
            where: { user_id: userId },
            relations: ['conversation', 'conversation.participants', 'conversation.participants.user', 'conversation.participants.user.partnerProfile', 'conversation.messages', 'conversation.messages.sender'],
            order: { conversation: { updated_at: 'DESC' } }
        });

        const activeParticipations = participations.filter(p => p.conversation.messages && p.conversation.messages.length > 0);

        return Promise.all(activeParticipations.map(async p => {
            const conversation = p.conversation;
            const otherParticipants = conversation.participants.filter(cp => cp.user_id !== userId);
            const otherUser = otherParticipants[0]?.user;

            const lastMessage = conversation.messages?.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];

            const unreadCount = await this.messageRepository
                .createQueryBuilder('message')
                .where('message.conversation_id = :conversationId', { conversationId: conversation.id })
                .andWhere('message.created_at > :lastReadAt', { lastReadAt: p.last_read_at || new Date(0) })
                .andWhere('message.sender_id != :userId', { userId })
                .getCount();

            return {
                id: conversation.id,
                name: otherUser?.full_name || 'Unknown',
                avatar: otherUser?.avatar,
                last_message: lastMessage ? {
                    body: lastMessage.body,
                    senderId: lastMessage.sender_id,
                    senderName: lastMessage.sender?.full_name || 'Unknown',
                    createdAt: lastMessage.created_at,
                    isMe: lastMessage.sender_id === userId
                } : null,
                unread_count: unreadCount,
                updated_at: conversation.updated_at,
                participants: conversation.participants.map(cp => ({
                    id: cp.user_id,
                    name: cp.user?.full_name || 'Người dùng',
                    role: cp.user?.role || 'customer',
                    email: cp.user?.email || '',
                    address: '',
                    avatarUrl: cp.user?.avatar || '',
                    phoneNumber: cp.user?.phone_number || '',
                    lastActivity: cp.last_read_at || new Date(),
                    status: cp.user?.partnerProfile?.is_online === true ? 'online' : 'offline',
                    last_read_at: cp.last_read_at
                }))
            };
        }));
    }

    async getConversationDetail(conversationId: string, userId: string) {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId },
            relations: ['participants', 'participants.user', 'participants.user.partnerProfile', 'messages', 'messages.sender'],
        });

        if (!conversation) return null;

        // Verify participant
        const isParticipant = conversation.participants.some(p => p.user_id === userId);
        if (!isParticipant) return null;

        const otherParticipants = conversation.participants.filter(cp => cp.user_id !== userId);
        const otherUser = otherParticipants[0]?.user;
        const lastMessage = conversation.messages?.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];

        const unreadCount = await this.messageRepository
            .createQueryBuilder('message')
            .where('message.conversation_id = :conversationId', { conversationId: conversation.id })
            .andWhere('message.created_at > :lastReadAt', { lastReadAt: new Date(0) }) // Simple check, or get actual read time from participant
            .andWhere('message.sender_id != :userId', { userId })
            .getCount();

        return {
            id: conversation.id,
            name: otherUser?.full_name || 'Unknown',
            avatar: otherUser?.avatar,
            last_message: lastMessage ? {
                body: lastMessage.body,
                senderId: lastMessage.sender_id,
                senderName: lastMessage.sender?.full_name || 'Unknown',
                createdAt: lastMessage.created_at,
                isMe: lastMessage.sender_id === userId
            } : null,
            unread_count: unreadCount,
            updated_at: conversation.updated_at,
            participants: conversation.participants.map(cp => ({
                id: cp.user_id,
                name: cp.user?.full_name || 'Người dùng',
                role: cp.user?.role || 'customer',
                email: cp.user?.email || '',
                address: '',
                avatarUrl: cp.user?.avatar || '',
                phoneNumber: cp.user?.phone_number || '',
                lastActivity: cp.last_read_at || new Date(),
                status: cp.user?.partnerProfile?.is_online === true ? 'online' : 'offline',
                last_read_at: cp.last_read_at
            }))
        };
    }

    async createConversation(userId: string, partnerId: string) {
        const existing = await this.conversationRepository.createQueryBuilder('c')
            .innerJoin('c.participants', 'p1')
            .innerJoin('c.participants', 'p2')
            .where('p1.user_id = :userId', { userId })
            .andWhere('p2.user_id = :partnerId', { partnerId })
            .getOne();

        if (existing) return existing;

        const conversation = await this.conversationRepository.save({});

        await this.chatParticipantRepository.save([
            { user_id: userId, conversation_id: conversation.id, joined_at: new Date() },
            { user_id: partnerId, conversation_id: conversation.id, joined_at: new Date() }
        ]);

        return conversation;
    }

    async deleteConversation(conversationId: string) {
        return this.conversationRepository.delete(conversationId);
    }

    async getMessages(conversationId: string, limit: number = 50) {
        return this.messageRepository.find({
            where: { conversation: { id: conversationId } },
            relations: ['sender'],
            order: { created_at: 'ASC' },
            take: limit
        });
    }

    async createMessage(conversationId: string, userId: string, createMessageDto: CreateMessageDto) {
        const message = await this.messageRepository.save({
            body: createMessageDto.body,
            sender_id: userId,
            conversation: { id: conversationId }
        });

        await this.conversationRepository.update(conversationId, { updated_at: new Date() });

        return message;
    }

    async markAsRead(conversationId: string, userId: string) {
        const lastMessage = await this.messageRepository.findOne({
            where: { conversation: { id: conversationId } },
            order: { created_at: 'DESC' }
        });

        if (!lastMessage) return;

        const participant = await this.chatParticipantRepository.findOne({
            where: { conversation_id: conversationId, user_id: userId }
        });

        if (participant && (!participant.last_read_at || participant.last_read_at < lastMessage.created_at)) {
            return this.chatParticipantRepository.update(
                { conversation_id: conversationId, user_id: userId },
                { last_read_at: new Date() }
            );
        }

        return;
    }
    async getTotalUnread(userId: string) {
        const conversations = await this.chatParticipantRepository.find({
            where: { user_id: userId },
            relations: ['conversation', 'conversation.messages']
        });

        let totalUnread = 0;

        for (const p of conversations) {
            const lastReadAt = p.last_read_at || new Date(0);
            // const hasUnread = await this.messageRepository.count({
            //     where: {
            //         conversation: { id: p.conversation_id },
            //         sender_id: userId ? undefined : undefined,
            //     }
            // });

            const unreadCount = await this.messageRepository
                .createQueryBuilder('message')
                .where('message.conversation_id = :conversationId', { conversationId: p.conversation_id })
                .andWhere('message.created_at > :lastReadAt', { lastReadAt })
                .andWhere('message.sender_id != :userId', { userId })
                .getCount();

            if (unreadCount > 0) {
                totalUnread++;
            }
        }

        return { total: totalUnread };
    }
}
