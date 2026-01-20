import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('push_notification_settings')
export class PushNotificationSetting {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ nullable: true })
    tpl_trip_request: string; // customer:new_trip_request

    @Column({ nullable: true })
    tpl_driver_arrived: string; // customer:driver_arrived

    @Column({ nullable: true })
    tpl_trip_cancelled: string; // customer:trip_cancelled

    @Column({ nullable: true })
    tpl_trip_confirmed: string; // partner:trip_confirmed

    @Column({ nullable: true })
    tpl_trip_rejected: string; // partner:trip_rejected

    @Column({ nullable: true })
    tpl_wallet_success: string; // WALLET_SUCCESS

    @Column({ nullable: true })
    tpl_wallet_failed: string; // WALLET_FAILED



    @Column({ nullable: true })
    tpl_contract_approved: string; // contract:approved

    @Column({ nullable: true })
    tpl_contract_terminated: string; // contract:terminated
}
