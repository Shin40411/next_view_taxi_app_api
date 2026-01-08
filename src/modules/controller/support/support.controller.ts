import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { SupportService } from 'src/modules/services/support/support.service';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { RolesGuard } from 'src/modules/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserRole } from 'src/utils/user-role.enum';
import { CreateTicketDto, ReplyTicketDto } from 'src/modules/dtos/support.dto';

@Controller('support')
@UseGuards(AuthGuard)
export class SupportController {
    constructor(private readonly supportService: SupportService) { }

    @Post()
    async createTicket(@Req() req, @Body() dto: CreateTicketDto) {
        return this.supportService.createTicket(req.user.sub, dto);
    }

    @Get()
    async getMyTickets(
        @Req() req,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
    ) {
        return this.supportService.getUserTickets(req.user.sub, fromDate, toDate);
    }

    @Get('admin')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async getAllTickets(
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
    ) {
        return this.supportService.getAllTickets(fromDate, toDate);
    }

    @Put(':id/reply')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async replyTicket(@Param('id') id: string, @Body() dto: ReplyTicketDto) {
        return this.supportService.replyTicket(id, dto);
    }
}
