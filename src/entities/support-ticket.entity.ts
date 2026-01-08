import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum TicketStatus {
    PENDING = 'PENDING',
    RESOLVED = 'RESOLVED',
    CLOSED = 'CLOSED'
}

@Entity('support_tickets')
export class SupportTicket {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    subject: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'text', nullable: true })
    admin_reply: string | null;

    @Column({
        type: 'enum',
        enum: TicketStatus,
        default: TicketStatus.PENDING
    })
    status: TicketStatus;

    @ManyToOne(() => User, (user) => user.supportTickets)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    user_id: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
