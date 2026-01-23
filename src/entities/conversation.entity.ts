import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Message } from './message.entity';
import { ChatParticipant } from './chat-participant.entity';

@Entity('conversations')
export class Conversation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToMany(() => Message, (message) => message.conversation)
    messages: Message[];

    @OneToMany(() => ChatParticipant, (participant) => participant.conversation)
    participants: ChatParticipant[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
