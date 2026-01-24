export class ResponseConversationsDto {
    id: string;
    name: string;
    avatar: string | null;
    last_message: {
        body: string;
        senderId: string;
        senderName: string;
        createdAt: Date;
        isMe: boolean;
    } | null;
    unread_count: number;
    updated_at: Date;
    participants: {
        id: string;
        name: string;
        role: string;
        email: string;
        address: string;
        avatarUrl: string;
        phoneNumber: string;
        lastActivity: Date;
        status: string;
        last_read_at: Date;
    }[];
}