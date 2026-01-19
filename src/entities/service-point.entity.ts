import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn, BeforeInsert } from 'typeorm';
import { User } from './user.entity';

@Entity('service_points')
export class ServicePoint {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    address: string;

    @Column({ nullable: true })
    province: string;

    @Column({
        type: 'point',
        srid: 4326,
        nullable: false,
    })
    location: string;

    @Column({ type: 'int', default: 50 })
    geofence_radius: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    reward_amount: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    advertising_budget: number;

    @Column({ type: 'int', default: 0, nullable: true })
    discount: number;

    @Column({ nullable: true })
    contract: string;

    @Column({ type: 'datetime', nullable: true, comment: 'Date when wallet expires' })
    wallet_expiry_date: Date | null;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'owner_id' })
    owner: User;

    @BeforeInsert()
    setDefaultExpiry() {
        if (!this.wallet_expiry_date) {
            const date = new Date();
            date.setFullYear(date.getFullYear() + 1);
            this.wallet_expiry_date = date;
        }
    }
}