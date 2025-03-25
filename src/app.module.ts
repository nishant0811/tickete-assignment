// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from './database/prisma.module';
import { InventoryApiService } from './external-api/inventory.service';
import { RateLimiterService } from './utils/rate-limiter.service';
import { SchedulerService } from './scheduler/scheduler.service';
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    HttpModule,
    PrismaModule, // Import the PrismaModule here
    InventoryModule,
  ],
  providers: [
    InventoryApiService,
    RateLimiterService,
    SchedulerService,
  ],
})
export class AppModule {}