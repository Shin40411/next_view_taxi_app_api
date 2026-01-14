import { Controller, Get, Param, Patch, Request, UseGuards, Delete, Query } from '@nestjs/common';
import { NotificationService } from '../../services/notification/notification.service';
import { AuthGuard } from '../../auth/guards/auth.guard';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get()
    async findAll(@Request() req, @Query('page') page: number = 1, @Query('limit') limit: number = 10) {
        return this.notificationService.findAllByUserId(req.user.sub, Number(page), Number(limit));
    }

    @Patch(':id/read')
    async markAsRead(@Param('id') id: string) {
        return this.notificationService.markAsRead(id);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.notificationService.delete(id);
    }
}
