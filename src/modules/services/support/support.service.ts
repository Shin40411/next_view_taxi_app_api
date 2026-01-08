import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket, TicketStatus } from 'src/entities/support-ticket.entity';
import { CreateTicketDto, ReplyTicketDto } from 'src/modules/dtos/support.dto';
import { User } from 'src/entities/user.entity';

@Injectable()
export class SupportService {
    constructor(
        @InjectRepository(SupportTicket)
        private ticketRepo: Repository<SupportTicket>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
    ) { }

    async createTicket(userId: string, dto: CreateTicketDto) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const ticket = this.ticketRepo.create({
            user,
            subject: dto.subject,
            content: dto.content,
        });

        return this.ticketRepo.save(ticket);
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
        const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
        if (!ticket) throw new NotFoundException('Ticket not found');

        ticket.admin_reply = dto.content;
        ticket.status = TicketStatus.RESOLVED;

        return this.ticketRepo.save(ticket);
    }
}
