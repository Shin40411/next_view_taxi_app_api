import { Module, Global } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
    imports: [AuthModule],
    providers: [SocketGateway],
    exports: [SocketGateway],
})
export class SocketModule { }
