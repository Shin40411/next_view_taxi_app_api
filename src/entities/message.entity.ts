import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from './user.entity';

@Entity('messages')
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    body: string;

    @Column({ default: 'text' })
    type: string;

    @ManyToOne(() => Conversation, (conversation) => conversation.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'conversation_id' })
    conversation: Conversation;

    @ManyToOne(() => User, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'sender_id' })
    sender: User;

    @Column({ nullable: true })
    sender_id: string;

    @CreateDateColumn()
    created_at: Date;
}
