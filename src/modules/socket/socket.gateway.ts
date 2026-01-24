import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../services/auth/auth.service';
import { NotificationService } from '../services/notification/notification.service';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class SocketGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private logger: Logger = new Logger('SocketGateway');

    private activeUsers: Map<string, string[]> = new Map();

    constructor(
        private authService: AuthService,
        private notificationService: NotificationService
    ) { }

    afterInit(server: Server) {
        this.logger.log('Socket Gateway Initialized');
    }

    async handleConnection(client: Socket, ...args: any[]) {
        try {
            const token = client.handshake.query.token as string | undefined;

            if (!token) {
                this.logger.warn(`Connection rejected: No token provided (Socket ID: ${client.id})`);
                client.disconnect();
                return;
            }

            const payload = await this.authService.validateToken(token);
            if (!payload) {
                this.logger.warn(`Connection rejected: Invalid token (Socket ID: ${client.id})`);
                client.disconnect();
                return;
            }

            const userId = payload.sub as string;
            client.data.user = payload;

            const userSockets = this.activeUsers.get(userId) || [];
            userSockets.push(client.id);
            this.activeUsers.set(userId, userSockets);

            this.logger.log(`Client connected: ${userId} (Socket ID: ${client.id})`);
            await this.authService.setPartnerStatus(userId, true);
        } catch (error) {
            this.logger.error(`Connection error: ${error.message}`);
            client.disconnect();
        }
    }

    async handleDisconnect(client: Socket) {
        const user = client.data.user;
        if (user) {
            const userId = user.sub as string;
            let userSockets = this.activeUsers.get(userId) || [];
            userSockets = userSockets.filter(id => id !== client.id);

            if (userSockets.length === 0) {
                this.activeUsers.delete(userId);
                await this.authService.setPartnerStatus(userId, false);
            } else {
                this.activeUsers.set(userId, userSockets);
            }

            this.logger.log(`Client disconnected: ${userId} (Socket ID: ${client.id})`);
        } else {
            this.logger.log(`Client disconnected (Unauthenticated): ${client.id}`);
        }
    }

    async sendToUser(userId: string, event: string, data: any, notification?: { title: string, body: string, type?: string }) {
        const socketIds = this.activeUsers.get(userId);
        console.log(`SocketGateway: Sending event ${event} to user ${userId}. Active sockets: ${socketIds?.length || 0}`);

        if (notification) {
            await this.notificationService.createForUser(userId, {
                title: notification.title,
                body: notification.body,
                type: notification.type || event,
                data: data
            });
        }

        if (socketIds && socketIds.length > 0) {
            socketIds.forEach(socketId => {
                this.server.to(socketId).emit(event, data);
            });
            return true;
        }
        return false;
    }
}
