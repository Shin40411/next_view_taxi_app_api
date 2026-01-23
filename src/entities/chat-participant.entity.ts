import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Conversation } from './conversation.entity';

@Entity('chat_participants')
export class ChatParticipant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, (user) => user.chatParticipations, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    user_id: string;

    @ManyToOne(() => Conversation, (conversation) => conversation.participants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'conversation_id' })
    conversation: Conversation;

    @Column()
    conversation_id: string;

    @Column({ nullable: true })
    last_read_at: Date;

    @CreateDateColumn()
    joined_at: Date;
}
