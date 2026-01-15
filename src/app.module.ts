import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
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
import { Setting } from './entities/setting.entity';
import { Faq } from './entities/faq.entity';

import { TripsController } from './modules/controller/trips/trips.controller';
import { TripsService } from './modules/services/trips/trips.service';
import { AdminController } from './modules/controller/admin/admin.controller';
import { SystemAdminController } from './modules/controller/admin/system-admin.controller';
import { AdminService } from './modules/services/admin/admin.service';
import { PartnerController } from './modules/controller/partners/partner.controller';
import { PartnerService } from './modules/services/partners/partner.service';
import { CustomerController } from './modules/controller/customers/customer.controller';
import { CustomerService } from './modules/services/customers/customer.service';
import { ContractController } from './modules/controller/contract/contract.controller';
import { ContractService } from './modules/services/contract/contract.service';
import { WalletController } from './modules/controller/wallet/wallet.controller';
import { WalletService } from './modules/services/wallet/wallet.service';

import { AuthModule } from './modules/module/auth.module';
import { SocketModule } from './modules/module/socket.module';
import { NotificationModule } from './modules/module/notification.module';
import { SettingsModule } from './modules/module/settings.module';
import { SupportModule } from './modules/module/support.module';
import { SupportTicket } from './entities/support-ticket.entity';
import { CompanyBankAccount } from './entities/company-bank-account.entity';
import { CompanyBankAccountModule } from './modules/module/company-bank-account.module';

import { VietmapService } from './utils/vietmap.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EncryptInterceptor } from './common/interceptors/encrypt.interceptor';
import { DecryptMiddleware } from './common/middlewares/decrypt.middleware';
import { SeedController } from './modules/controller/seed/seed.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksModule } from './modules/module/tasks.module';

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

      entities: [User, PartnerProfile, ServicePoint, Trip, PointTransaction, BankAccount, Notification, Contract, WalletTransaction, Setting, SupportTicket, Faq, CompanyBankAccount],
      synchronize: true,
      legacySpatialSupport: false,
    }),

    TypeOrmModule.forFeature([User, PartnerProfile, ServicePoint, Trip, PointTransaction, BankAccount, Contract, WalletTransaction]),
    AuthModule,
    SocketModule,
    NotificationModule,
    SettingsModule,
    SupportModule,
    CompanyBankAccountModule,
    ScheduleModule.forRoot(),
    TasksModule,
  ],
  controllers: [SeedController, TripsController, AdminController, SystemAdminController, PartnerController, CustomerController, ContractController, WalletController],
  providers: [
    TripsService,
    AdminService,
    PartnerService,
    CustomerService,
    VietmapService,
    ContractService,
    WalletService,
    {
      provide: APP_INTERCEPTOR,
      useClass: EncryptInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(DecryptMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}