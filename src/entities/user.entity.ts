import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, OneToMany } from 'typeorm';
import { UserRole } from '../utils/user-role.enum';
import { PartnerProfile } from './partner-profile.entity';
import { ServicePoint } from './service-point.entity';

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

    @Column({ type: 'enum', enum: UserRole, default: UserRole.PARTNER })
    role: UserRole;

    @CreateDateColumn()
    created_at: Date;

    @OneToOne(() => PartnerProfile, (profile) => profile.user)
    partnerProfile: PartnerProfile;

    @OneToMany(() => ServicePoint, (servicePoint) => servicePoint.owner)
    servicePoints: ServicePoint[];
}
