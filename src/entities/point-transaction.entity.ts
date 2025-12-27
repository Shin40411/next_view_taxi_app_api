import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { ServicePoint } from './service-point.entity';
import { Trip } from './trip.entity';
import { TransactionType } from 'src/utils/point-transaction-enum';



@Entity('point_transactions')
export class PointTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => ServicePoint)
    @JoinColumn({ name: 'service_point_id' })
    servicePoint: ServicePoint;

    @ManyToOne(() => Trip, { nullable: true })
    @JoinColumn({ name: 'trip_id' })
    trip: Trip;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({ type: 'enum', enum: TransactionType })
    type: TransactionType;

    @Column({ nullable: true })
    description: string;

    @CreateDateColumn()
    created_at: Date;
}
