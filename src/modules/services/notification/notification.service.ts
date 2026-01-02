import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from 'src/entities/notification.entity';
import { User } from 'src/entities/user.entity';
import { UserRole } from 'src/utils/user-role.enum';

@Injectable()
export class NotificationService {
    constructor(
        @InjectRepository(Notification)
        private notificationRepository: Repository<Notification>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    async create(data: Partial<Notification>): Promise<Notification> {
        const notification = this.notificationRepository.create(data);
        return this.notificationRepository.save(notification);
    }

    async createForUser(userId: string, data: Partial<Notification>): Promise<void> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user || user.role === UserRole.ADMIN) {
            return;
        }

        const notification = this.notificationRepository.create({
            ...data,
            userId: userId,
        });
        await this.notificationRepository.save(notification);
    }

    async findAllByUserId(userId: string): Promise<Notification[]> {
        return this.notificationRepository.find({
            where: { userId },
            order: { created_at: 'DESC' },
        });
    }

    async findUnreadByUserId(userId: string): Promise<Notification[]> {
        return this.notificationRepository.find({
            where: { userId, is_read: false },
            order: { created_at: 'DESC' },
        });
    }

    async markAsRead(id: string): Promise<void> {
        await this.notificationRepository.update(id, { is_read: true });
    }

    async delete(id: string): Promise<void> {
        await this.notificationRepository.delete(id);
    }
}
