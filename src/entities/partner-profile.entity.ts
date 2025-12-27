import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('partner_profiles')
export class PartnerProfile {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => User, (user) => user.partnerProfile)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'varchar', nullable: true })
    brand: string | null;

    @Column()
    vehicle_plate: string;

    @Column({ type: 'varchar', nullable: true })
    id_card_front: string | null;

    @Column({ type: 'varchar', nullable: true })
    id_card_back: string | null;

    @Column({ type: 'varchar', nullable: true })
    driver_license_front: string | null;

    @Column({ type: 'varchar', nullable: true })
    driver_license_back: string | null;

    @Column({ default: false })
    is_online: boolean;

    @Index({ spatial: true })
    @Column({
        type: 'point',
        srid: 4326,
        nullable: false,
    })
    current_location: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    wallet_balance: number;
}