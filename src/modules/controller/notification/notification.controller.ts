import { Controller, Get, Param, Patch, Request, UseGuards, Delete } from '@nestjs/common';
import { NotificationService } from '../../services/notification/notification.service';
import { AuthGuard } from '../../auth/auth.guard';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get()
    async findAll(@Request() req) {
        return this.notificationService.findAllByUserId(req.user.sub);
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
