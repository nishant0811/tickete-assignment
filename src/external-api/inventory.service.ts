// src/external-api/inventory.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { RateLimiterService } from '../utils/rate-limiter.service';
import { PrismaService } from '../database/prisma.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class InventoryApiService {
  private readonly logger = new Logger(InventoryApiService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly rateLimiter: RateLimiterService,
    private readonly prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('API_KEY');
    this.baseUrl = 'https://leap-api.tickete.co';
  }

  async fetchInventory(productId: number, date: string): Promise<any> {
    // Acquire token from rate limiter (will wait if needed)
    await this.rateLimiter.acquireToken();

    try {
      // The date parameter should already be in YYYYMMDD format for the API
      const url = `${this.baseUrl}/api/v1/inventory/${productId}?date=${date}`;
      this.logger.debug(`Fetching inventory: ${url}`);

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'x-api-key': this.apiKey,
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch inventory for product ${productId} on ${date}`,
        error.stack,
      );
      throw error;
    }
  }

  async saveInventoryData(
    productId: number,
    date: string,
    data: any[],
  ): Promise<void> {
    try {
      // Format date properly for database storage
      let formattedDate: Date;

      if (date.includes('-')) {
        // Already in YYYY-MM-DD format
        formattedDate = new Date(date);
      } else if (date.length === 8) {
        // Format from YYYYMMDD to a proper Date object
        const year = date.substring(0, 4);
        const month = date.substring(4, 6);
        const day = date.substring(6, 8);
        formattedDate = new Date(`${year}-${month}-${day}`);
      } else {
        throw new Error(
          `Invalid date format: ${date}. Expected YYYY-MM-DD or YYYYMMDD.`,
        );
      }

      // Validate that we have a valid date
      if (isNaN(formattedDate.getTime())) {
        throw new Error(`Invalid date: ${date}`);
      }

      // Create or update availability record
      const availability = await this.prisma.availability.upsert({
        where: {
          productId_date: {
            productId,
            date: formattedDate,
          },
        },
        update: {},
        create: {
          productId,
          date: formattedDate,
        },
      });

      // First, clear existing time slots for this date to avoid duplicates
      // Get all current timeSlot IDs
      const existingTimeSlots = await this.prisma.timeSlot.findMany({
        where: { availabilityId: availability.id },
        select: { id: true },
      });

      const timeSlotIds = existingTimeSlots.map((slot) => slot.id);

      // Delete associated paxAvailability records first (due to foreign key constraints)
      if (timeSlotIds.length > 0) {
        await this.prisma.paxAvailability.deleteMany({
          where: { timeSlotId: { in: timeSlotIds } },
        });

        // Then delete the time slots
        await this.prisma.timeSlot.deleteMany({
          where: { id: { in: timeSlotIds } },
        });
      }

      // Get a list of all providerSlotIds in the current data batch
      const providerSlotIds = data.map((slot) => slot.providerSlotId);

      // Find any existing time slots with these providerSlotIds in the database
      // (might be from other availability records, e.g., different dates)
      const existingProviderSlots = await this.prisma.timeSlot.findMany({
        where: {
          providerSlotId: {
            in: providerSlotIds,
          },
        },
        include: {
          paxAvailability: true,
        },
      });

      // Create a map for faster lookup
      const existingProviderSlotsMap = new Map();
      for (const slot of existingProviderSlots) {
        existingProviderSlotsMap.set(slot.providerSlotId, slot);
      }

      // Process time slots from the API response
      for (const slot of data) {
        let timeSlot;

        // Check if this providerSlotId already exists in the database
        if (existingProviderSlotsMap.has(slot.providerSlotId)) {
          const existingSlot = existingProviderSlotsMap.get(
            slot.providerSlotId,
          );

          // Delete existing pax availabilities to avoid constraint issues
          if (existingSlot.paxAvailability.length > 0) {
            await this.prisma.paxAvailability.deleteMany({
              where: { timeSlotId: existingSlot.id },
            });
          }

          // Update the existing time slot to point to the current availability
          timeSlot = await this.prisma.timeSlot.update({
            where: { id: existingSlot.id },
            data: {
              availabilityId: availability.id,
              startTime: slot.startTime,
              endTime: slot.endTime,
              variantId: slot.variantId,
              currencyCode: slot.currencyCode,
              remaining: slot.remaining,
            },
          });

          this.logger.debug(
            `Updated existing time slot with providerSlotId: ${slot.providerSlotId}`,
          );
        } else {
          // Create a new time slot if it doesn't exist
          timeSlot = await this.prisma.timeSlot.create({
            data: {
              availabilityId: availability.id,
              startTime: slot.startTime,
              endTime: slot.endTime,
              providerSlotId: slot.providerSlotId,
              variantId: slot.variantId,
              currencyCode: slot.currencyCode,
              remaining: slot.remaining,
            },
          });

          this.logger.debug(
            `Created new time slot with providerSlotId: ${slot.providerSlotId}`,
          );
        }

        // Process pax types
        for (const pax of slot.paxAvailability) {
          // Find or create pax type
          let paxType = await this.prisma.paxType.findUnique({
            where: { type: pax.type },
          });

          if (!paxType) {
            paxType = await this.prisma.paxType.create({
              data: {
                type: pax.type,
                name: pax.name,
                description: pax.description,
              },
            });
          }

          // Create pax availability with the complete price object
          await this.prisma.paxAvailability.create({
            data: {
              timeSlotId: timeSlot.id,
              paxTypeId: paxType.id,
              price: pax.price,
              min: pax.min,
              max: pax.max,
              remaining: pax.remaining,
              isPrimary: pax.isPrimary || false,
            },
          });
        }
      }

      this.logger.log(
        `Successfully saved inventory data for product ${productId} on ${date}: ${data.length} time slots`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to save inventory data for product ${productId} on ${date}`,
        error.stack,
      );
      throw error;
    }
  }
}
