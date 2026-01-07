import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { ContractStatus } from 'src/utils/contract-status.enum';

@Entity('contracts')
export class Contract {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    full_name: string;

    @Column()
    birth_year: string;

    @Column()
    phone_number: string;

    @Column()
    cccd: string;

    @Column()
    address: string;

    @Column()
    vehicle: string;

    @Column({ type: 'text' }) // Use text for base64 signature as it can be long
    signature: string;

    @Column({ name: 'user_id' })
    user_id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @CreateDateColumn()
    created_at: Date;

    @Column({
        type: 'enum',
        enum: ContractStatus,
        default: ContractStatus.ACTIVE,
    })
    status: ContractStatus;
}
