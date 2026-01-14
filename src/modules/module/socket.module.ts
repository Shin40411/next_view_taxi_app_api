import { Module, Global } from '@nestjs/common';
import { SocketGateway } from '../socket/socket.gateway';
import { AuthModule } from './auth.module';
import { NotificationModule } from './notification.module';

@Global()
@Module({
    imports: [AuthModule, NotificationModule],
    providers: [SocketGateway],
    exports: [SocketGateway],
})
export class SocketModule { }
