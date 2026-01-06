import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { PartnerProfile } from './entities/partner-profile.entity';
import { ServicePoint } from './entities/service-point.entity';
import { Trip } from './entities/trip.entity';
import { PointTransaction } from './entities/point-transaction.entity';
import { BankAccount } from './entities/bank-account.entity';
import { Notification } from './entities/notification.entity';
import { Contract } from './entities/contract.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { SeedController } from './seed/seed.controller';
import { TripsController } from './modules/controller/trips/trips.controller';
import { TripsService } from './modules/services/trips/trips.service';
import { AdminController } from './modules/controller/admin/admin.controller';
import { AdminService } from './modules/services/admin/admin.service';
import { PartnerController } from './modules/controller/partners/partner.controller';
import { PartnerService } from './modules/services/partners/partner.service';
import { CustomerController } from './modules/controller/customers/customer.controller';
import { CustomerService } from './modules/services/customers/customer.service';
import { ContractController } from './modules/controller/contract/contract.controller';
import { ContractService } from './modules/services/contract/contract.service';
import { WalletController } from './modules/controller/wallet/wallet.controller';
import { WalletService } from './modules/services/wallet/wallet.service';
import { AuthModule } from './modules/auth/auth.module';
import { SocketModule } from './modules/socket/socket.module';
import { NotificationModule } from './modules/notification/notification.module';

import { VietmapService } from './utils/vietmap.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/assets/uploads',
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST!,
      port: Number(process.env.DB_PORT) || 3306,
      username: process.env.DB_USERNAME!,
      password: process.env.DB_PASSWORD!,
      database: process.env.DB_NAME || 'taxi_app_db',

      entities: [User, PartnerProfile, ServicePoint, Trip, PointTransaction, BankAccount, Notification, Contract, WalletTransaction],
      synchronize: true,
      legacySpatialSupport: false,
    }),

    TypeOrmModule.forFeature([User, PartnerProfile, ServicePoint, Trip, PointTransaction, BankAccount, Contract, WalletTransaction]),
    AuthModule,
    SocketModule,
    NotificationModule,
  ],
  controllers: [SeedController, TripsController, AdminController, PartnerController, CustomerController, ContractController, WalletController],
  providers: [TripsService, AdminService, PartnerService, CustomerService, VietmapService, ContractService, WalletService],
})
export class AppModule { }