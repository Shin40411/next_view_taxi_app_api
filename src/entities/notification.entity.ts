import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column()
    body: string;

    @Column({ nullable: true })
    type: string;

    @Column({ default: false })
    is_read: boolean;

    @Column({ type: 'json', nullable: true })
    data: any;

    @CreateDateColumn()
    created_at: Date;

    @Column()
    userId: string;

    @ManyToOne(() => User, user => user.notifications)
    @JoinColumn({ name: 'userId' })
    user: User;
}
