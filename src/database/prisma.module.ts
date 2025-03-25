// src/database/prisma.module.ts
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // This makes the module global so it can be used across the application
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Export the service so it can be used by other modules
})
export class PrismaModule {}