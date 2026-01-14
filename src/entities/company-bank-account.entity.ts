import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('company_bank_accounts')
export class CompanyBankAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    bankName: string;

    @Column()
    accountName: string;

    @Column()
    accountNo: string;

    @Column({ type: 'text', nullable: true })
    content: string;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
