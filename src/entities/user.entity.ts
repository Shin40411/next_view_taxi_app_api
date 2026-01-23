import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, OneToMany } from 'typeorm';
import { UserRole } from '../utils/user-role.enum';
import { PartnerProfile } from './partner-profile.entity';
import { ServicePoint } from './service-point.entity';
import { BankAccount } from './bank-account.entity';
import { Notification } from './notification.entity';
import { Contract } from './contract.entity';
import { SupportTicket } from './support-ticket.entity';
import { ChatParticipant } from './chat-participant.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    username: string;

    @Column()
    password_hash: string;

    @Column()
    full_name: string;

    @Column({ type: 'varchar', nullable: true })
    tax_id: string | null;

    @Column({ type: 'varchar', nullable: true })
    email: string | null;

    @Column({ type: 'varchar', nullable: true })
    phone_number: string | null;

    @Column({ type: 'varchar', nullable: true, unique: true })
    google_id: string | null;

    @Column({ type: 'varchar', nullable: true })
    avatar: string | null;

    @Column({ type: 'enum', enum: UserRole, default: UserRole.PARTNER })
    role: UserRole;

    @CreateDateColumn()
    created_at: Date;

    @Column({ default: false })
    isDelete: boolean;

    @OneToOne(() => PartnerProfile, (profile) => profile.user)
    partnerProfile: PartnerProfile;

    @OneToOne(() => BankAccount, (bankAccount) => bankAccount.user)
    bankAccount: BankAccount;

    @OneToMany(() => ServicePoint, (servicePoint) => servicePoint.owner)
    servicePoints: ServicePoint[];

    @OneToMany(() => Notification, (notification) => notification.user)
    notifications: Notification[];

    @OneToMany(() => Contract, (contract) => contract.user)
    contracts: Contract[];

    @OneToMany(() => SupportTicket, (ticket) => ticket.user)
    supportTickets: SupportTicket[];

    @OneToMany(() => ChatParticipant, (participant) => participant.user)
    chatParticipations: ChatParticipant[];
}
