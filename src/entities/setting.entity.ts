import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('settings')
export class Setting {
    @PrimaryGeneratedColumn('increment')
    id: number;

    // Google
    @Column({ nullable: true })
    google_client_id: string;

    @Column({ nullable: true })
    google_client_secret: string;

    @Column({ nullable: true })
    google_callback_url: string;

    // Zalo
    @Column({ nullable: true })
    zalo_app_id: string;

    @Column({ nullable: true })
    zalo_secret_key: string;

    @Column({ nullable: true })
    zalo_template_id_otp: string;

    @Column({ type: 'text', nullable: true })
    zalo_access_token: string;

    @Column({ type: 'text', nullable: true })
    zalo_refresh_token: string;

    // Mail
    @Column({ nullable: true })
    mail_host: string;

    @Column({ nullable: true })
    mail_port: number;

    @Column({ nullable: true })
    mail_user: string;

    @Column({ nullable: true })
    mail_pass: string;

    @Column({ nullable: true })
    mail_from: string;
}
