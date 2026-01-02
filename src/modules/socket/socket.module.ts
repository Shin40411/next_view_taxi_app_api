import { Module, Global } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';

@Global()
@Module({
    imports: [AuthModule, NotificationModule],
    providers: [SocketGateway],
    exports: [SocketGateway],
})
export class SocketModule { }
