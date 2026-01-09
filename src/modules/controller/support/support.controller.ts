import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards, Delete } from '@nestjs/common';
import { SupportService } from 'src/modules/services/support/support.service';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { RolesGuard } from 'src/modules/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { UserRole } from 'src/utils/user-role.enum';
import { CreateTicketDto, ReplyTicketDto } from 'src/modules/dtos/support.dto';
import { CreateFaqDto, UpdateFaqDto } from 'src/modules/dtos/faq.dto';

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

    // FAQ Endpoints

    @Post('faqs')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async createFaq(@Body() dto: CreateFaqDto) {
        return this.supportService.createFaq(dto);
    }

    @Get('faqs')
    async getFaqs(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('search') search?: string,
    ) {
        return this.supportService.getFaqs(page, limit, search);
    }

    @Put('faqs/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async updateFaq(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
        return this.supportService.updateFaq(id, dto);
    }

    @Delete('faqs/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async deleteFaq(@Param('id') id: string) {
        return this.supportService.deleteFaq(id);
    }
}
