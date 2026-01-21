import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { ServicePoint } from './service-point.entity';
import { TripStatus } from 'src/utils/trips-status-enum';

@Entity('trips')
export class Trip {
    @PrimaryGeneratedColumn('uuid')
    trip_id: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    trip_code: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'partner_id' })
    partner: User;

    @ManyToOne(() => ServicePoint)
    @JoinColumn({ name: 'service_point_id' })
    servicePoint: ServicePoint;

    @Column({ type: 'int', default: 1 })
    guest_count: number;

    @Column({ type: 'int', nullable: true })
    actual_guest_count: number;

    @Column({ type: 'enum', enum: TripStatus, default: TripStatus.PENDING_CONFIRMATION })
    status: TripStatus;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    reward_snapshot: number;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @Column({ nullable: true })
    arrival_time: Date;

    @Column({ type: 'text', nullable: true })
    reject_reason: string;
}