import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { TransactionType, TransactionStatus } from 'src/utils/wallet-transaction-enum';

@Entity('wallet_transactions')
export class WalletTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'sender_id' })
    sender: User;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'receiver_id' })
    receiver: User | null;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount: number;

    @Column({ type: 'enum', enum: TransactionType })
    type: TransactionType;

    @Column({ nullable: true })
    bill: string;

    @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
    status: TransactionStatus;

    @Column({ nullable: true })
    reason?: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'employee_id' })
    employee: User;

    @CreateDateColumn()
    created_at: Date;
}
