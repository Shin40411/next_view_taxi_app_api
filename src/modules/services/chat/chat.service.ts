import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatParticipant } from 'src/entities/chat-participant.entity';
import { Conversation } from 'src/entities/conversation.entity';
import { Message } from 'src/entities/message.entity';
import { CreateMessageDto } from '../../dtos/create-message.dto';
import { ResponseConversationsDto } from '../../dtos/response-conversations.dto';
import { Repository, IsNull } from 'typeorm';
import { ResponseConversationDetailDto } from 'src/modules/dtos/response-conversation-detail.dto';

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

    private async getUnreadCountsMap(userId: string): Promise<Map<string, number>> {
        const query = this.messageRepository.createQueryBuilder('message')
            .innerJoin('chat_participants', 'cp', 'cp.conversation_id = message.conversation_id')
            .where('cp.user_id = :userId', { userId })
            .andWhere('cp.deleted_at IS NULL')
            .andWhere('message.sender_id != :userId', { userId })
            .andWhere('message.created_at > COALESCE(cp.last_read_at, :epoch)', { epoch: new Date(0) });

        query.andWhere(
            '(cp.messages_cleared_at IS NULL OR message.created_at > cp.messages_cleared_at)'
        );

        query.select('message.conversation_id', 'conversation_id')
            .addSelect('COUNT(message.id)', 'count')
            .groupBy('message.conversation_id');

        const results = await query.getRawMany();

        const map = new Map<string, number>();
        results.forEach(row => {
            map.set(row.conversation_id, Number(row.count));
        });

        return map;
    }

    async getConversations(userId: string) {
        const participations = await this.chatParticipantRepository.find({
            where: { user_id: userId },
            relations: ['conversation', 'conversation.participants', 'conversation.participants.user', 'conversation.participants.user.partnerProfile', 'conversation.messages', 'conversation.messages.sender'],
            order: { conversation: { updated_at: 'DESC' } }
        });

        const unreadCountsMap = await this.getUnreadCountsMap(userId);

        const activeParticipations = participations.filter(p => {
            if (p.deleted_at !== null) return false;

            const visibleMessages = p.messages_cleared_at
                ? p.conversation.messages?.filter(m => m.created_at > p.messages_cleared_at)
                : p.conversation.messages;

            return visibleMessages && visibleMessages.length > 0;
        });

        return Promise.all(activeParticipations.map(async p => {
            const conversation = p.conversation;
            const otherParticipants = conversation.participants.filter(cp => cp.user_id !== userId);
            const otherUser = otherParticipants[0]?.user;

            const visibleMessages = p.messages_cleared_at
                ? conversation.messages?.filter(m => m.created_at > p.messages_cleared_at)
                : conversation.messages;

            const lastMessage = visibleMessages?.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];

            const unreadCount = unreadCountsMap.get(conversation.id) || 0;

            const result: ResponseConversationsDto = {
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

            return result;
        }));
    }

    async getConversationDetail(conversationId: string, userId: string) {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId },
            relations: ['participants', 'participants.user', 'participants.user.partnerProfile', 'messages', 'messages.sender'],
        });

        if (!conversation) return null;

        const participant = conversation.participants.find(p => p.user_id === userId);
        if (!participant) return null;

        if (participant.deleted_at) return null;

        const otherParticipants = conversation.participants.filter(cp => cp.user_id !== userId);
        const otherUser = otherParticipants[0]?.user;

        const visibleMessages = participant.messages_cleared_at
            ? conversation.messages?.filter(m => m.created_at > participant.messages_cleared_at)
            : conversation.messages;

        const lastMessage = visibleMessages?.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];

        const queryBuilder = this.messageRepository
            .createQueryBuilder('message')
            .where('message.conversation_id = :conversationId', { conversationId: conversation.id })
            .andWhere('message.created_at > :lastReadAt', { lastReadAt: participant.last_read_at || new Date(0) })
            .andWhere('message.sender_id != :userId', { userId });

        if (participant.messages_cleared_at) {
            queryBuilder.andWhere('message.created_at > :clearedAt', { clearedAt: participant.messages_cleared_at });
        }

        const unreadCount = await queryBuilder.getCount();

        const result: ResponseConversationDetailDto = {
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
        }

        return result;
    }

    async createConversation(userId: string, partnerId: string) {
        const existing = await this.conversationRepository.createQueryBuilder('c')
            .innerJoin('c.participants', 'p1')
            .innerJoin('c.participants', 'p2')
            .where('p1.user_id = :userId', { userId })
            .andWhere('p2.user_id = :partnerId', { partnerId })
            .getOne();

        if (existing) {
            await this.chatParticipantRepository.update(
                { conversation_id: existing.id, user_id: userId },
                { deleted_at: null as any }
            );
            return existing;
        }

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

    async getMessages(conversationId: string, userId: string, limit: number = 10, before?: string, beforeId?: string) {
        const participant = await this.chatParticipantRepository.findOne({
            where: { conversation_id: conversationId, user_id: userId }
        });

        if (!participant || participant.deleted_at) {
            return { results: [], total: 0 };
        }

        const queryBuilder = this.messageRepository
            .createQueryBuilder('message')
            .leftJoinAndSelect('message.sender', 'sender')
            .where('message.conversation_id = :conversationId', { conversationId })
            .orderBy('message.created_at', 'DESC')
            .addOrderBy('message.id', 'DESC')
            .take(limit);

        if (before) {
            const beforeDate = new Date(before);
            if (beforeId) {
                queryBuilder.andWhere(
                    '(message.created_at < :before OR (message.created_at = :before AND message.id < :beforeId))',
                    { before: beforeDate, beforeId }
                );
            } else {
                queryBuilder.andWhere('message.created_at < :before', { before: beforeDate });
            }
        }

        if (participant.messages_cleared_at) {
            queryBuilder.andWhere('message.created_at > :clearedAt', {
                clearedAt: participant.messages_cleared_at
            });
        }

        const [messages, count] = await Promise.all([
            queryBuilder.getMany(),
            this.messageRepository
                .createQueryBuilder('message')
                .innerJoin('chat_participants', 'cp', 'cp.conversation_id = message.conversation_id')
                .where('message.conversation_id = :conversationId', { conversationId })
                .andWhere('cp.user_id = :userId', { userId })
                .andWhere('(cp.messages_cleared_at IS NULL OR message.created_at > cp.messages_cleared_at)')
                .getCount()
        ]);

        return {
            results: messages.reverse(),
            total: count
        };
    }

    async createMessage(conversationId: string, userId: string, createMessageDto: CreateMessageDto) {
        const participants = await this.chatParticipantRepository.find({
            where: { conversation_id: conversationId },
            relations: ['user']
        });

        const otherParticipants = participants.filter(p => p.user_id !== userId);
        const hasValidRecipient = otherParticipants.some(p => p.user !== null);

        if (!hasValidRecipient) {
            throw new Error('Không thể gửi tin nhắn. Người nhận không còn tồn tại.');
        }

        const message = await this.messageRepository.save({
            body: createMessageDto.body,
            sender_id: userId,
            conversation: { id: conversationId }
        });

        await this.conversationRepository.update(conversationId, { updated_at: new Date() });
        await this.chatParticipantRepository.update(
            { conversation_id: conversationId },
            { deleted_at: null as any }
        );

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
        const query = this.messageRepository.createQueryBuilder('message')
            .innerJoin('chat_participants', 'cp', 'cp.conversation_id = message.conversation_id')
            .where('cp.user_id = :userId', { userId })
            .andWhere('cp.deleted_at IS NULL')
            .andWhere('message.sender_id != :userId', { userId })
            .andWhere('message.created_at > COALESCE(cp.last_read_at, :epoch)', { epoch: new Date(0) });

        query.andWhere(
            '(cp.messages_cleared_at IS NULL OR message.created_at > cp.messages_cleared_at)'
        );

        const result = await query
            .select('COUNT(DISTINCT message.conversation_id)', 'count')
            .getRawOne();

        return { total: Number(result.count) };
    }

    async deleteConversationForUser(conversationId: string, userId: string) {
        const now = new Date();
        return this.chatParticipantRepository.update(
            { conversation_id: conversationId, user_id: userId },
            { deleted_at: now, messages_cleared_at: now }
        );
    }

    async getParticipantIds(conversationId: string): Promise<string[]> {
        const participants = await this.chatParticipantRepository.find({
            where: { conversation_id: conversationId },
            select: ['user_id']
        });
        return participants.map(p => p.user_id);
    }
}
