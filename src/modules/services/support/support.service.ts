import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket, TicketStatus } from 'src/entities/support-ticket.entity';
import { CreateTicketDto, ReplyTicketDto } from 'src/modules/dtos/support.dto';
import { User } from 'src/entities/user.entity';
import { NotificationService } from 'src/modules/services/notification/notification.service';
import { Faq } from 'src/entities/faq.entity';
import { CreateFaqDto, UpdateFaqDto } from 'src/modules/dtos/faq.dto';
import { MailService } from '../mail/mail.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class SupportService {
    constructor(
        @InjectRepository(SupportTicket)
        private ticketRepo: Repository<SupportTicket>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        @InjectRepository(Faq)
        private faqRepo: Repository<Faq>,
        private notificationService: NotificationService,
        private mailService: MailService,
        private settingsService: SettingsService,
    ) { }

    async createTicket(userId: string, dto: CreateTicketDto) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const ticket = this.ticketRepo.create({
            user,
            subject: dto.subject,
            content: dto.content,
        });



        await this.ticketRepo.save(ticket);

        const settings = await this.settingsService.getSettings();
        if (settings?.email_receive) {
            await this.mailService.sendSupportTicketNotification(
                settings.email_receive,
                user.full_name,
                ticket.subject,
                ticket.content,
            );
        }

        return ticket;
    }

    async getUserTickets(userId: string, fromDate?: string, toDate?: string) {
        const query = this.ticketRepo.createQueryBuilder('ticket')
            .where('ticket.user_id = :userId', { userId })
            .orderBy('ticket.created_at', 'DESC');

        if (fromDate) {
            query.andWhere('ticket.created_at >= :fromDate', { fromDate });
        }
        if (toDate) {
            // Ensure toDate includes the entire day
            const endOfDay = new Date(toDate);
            endOfDay.setHours(23, 59, 59, 999);
            query.andWhere('ticket.created_at <= :toDate', { toDate: endOfDay });
        }

        return query.getMany();
    }

    async getAllTickets(fromDate?: string, toDate?: string) {
        const query = this.ticketRepo.createQueryBuilder('ticket')
            .leftJoinAndSelect('ticket.user', 'user')
            .orderBy('ticket.created_at', 'DESC');

        if (fromDate) {
            query.andWhere('ticket.created_at >= :fromDate', { fromDate });
        }
        if (toDate) {
            const endOfDay = new Date(toDate);
            endOfDay.setHours(23, 59, 59, 999);
            query.andWhere('ticket.created_at <= :toDate', { toDate: endOfDay });
        }

        return query.getMany();
    }

    async replyTicket(ticketId: string, dto: ReplyTicketDto) {
        const ticket = await this.ticketRepo.findOne({ where: { id: ticketId }, relations: ['user'] });
        if (!ticket) throw new NotFoundException('Ticket not found');

        ticket.admin_reply = dto.content;
        ticket.status = TicketStatus.RESOLVED;

        const savedTicket = await this.ticketRepo.save(ticket);

        await this.notificationService.createForUser(ticket.user.id, {
            title: 'Phản hồi hỗ trợ',
            body: `Admin đã trả lời yêu cầu hỗ trợ của bạn: ${ticket.subject}`,
            type: 'system',
        });

        return savedTicket;
    }

    // FAQ
    async createFaq(dto: CreateFaqDto) {
        const faq = this.faqRepo.create(dto);
        return this.faqRepo.save(faq);
    }

    async getFaqs(page: number = 1, limit: number = 10, search?: string) {
        const query = this.faqRepo.createQueryBuilder('faq');

        if (search) {
            query.where('faq.question LIKE :search OR faq.answer LIKE :search', { search: `%${search}%` });
        }

        query.orderBy('faq.created_at', 'DESC');
        query.skip((page - 1) * limit);
        query.take(limit);

        const [data, total] = await query.getManyAndCount();
        return { data, total };
    }

    async updateFaq(id: string, dto: UpdateFaqDto) {
        const faq = await this.faqRepo.findOne({ where: { id } });
        if (!faq) throw new NotFoundException('FAQ not found');

        Object.assign(faq, dto);
        return this.faqRepo.save(faq);
    }

    async deleteFaq(id: string) {
        const result = await this.faqRepo.delete(id);
        if (result.affected === 0) throw new NotFoundException('FAQ not found');
        return { message: 'FAQ deleted successfully' };
    }
}
