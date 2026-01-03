import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
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

    @ManyToOne(() => User)
    @JoinColumn({ name: 'owner_id' })
    owner: User;
}