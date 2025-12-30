import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('bank_accounts')
export class BankAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    bank_name: string;

    @Column()
    account_number: string;

    @Column()
    account_holder_name: string;

    @OneToOne(() => User, (user) => user.bankAccount)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
