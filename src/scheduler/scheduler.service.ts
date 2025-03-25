// src/scheduler/scheduler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InventoryApiService } from '../external-api/inventory.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly productIds: number[] = [14, 15];

  constructor(private readonly inventoryApiService: InventoryApiService) {}

  // Daily fetch for next 30 days
  @Cron('0 0 * * *') // At midnight every day
  async fetchNext30Days() {
    this.logger.log('Starting daily fetch for next 30 days');

    const dates = this.generateDateRange(1, 30); // Days 1-30 from today
    await this.fetchInventoryBatch(dates);
  }

  // Every 4 hours fetch for next 7 days
  @Cron('0 0,4,8,12,16,20 * * *') // Every 4 hours
  async fetchNext7Days() {
    this.logger.log('Starting 4-hourly fetch for next 7 days');

    const dates = this.generateDateRange(0, 7); // Today + next 6 days
    await this.fetchInventoryBatch(dates);
  }

  // Every 15 minutes fetch for today
  @Cron('*/1 * * * *') // Every 15 minutes
  async fetchToday() {
    this.logger.log('Starting 15-minute fetch for today');

    const today = new Date().toISOString().split('T')[0];
    await this.fetchInventoryBatch([today]);
  }

  /**
   * Generates an array of date strings in YYYY-MM-DD format
   */
  private generateDateRange(
    startDaysFromNow: number,
    endDaysFromNow: number,
  ): string[] {
    const dates: string[] = [];
    const now = new Date();

    for (let i = startDaysFromNow; i < endDaysFromNow; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }

    return dates;
  }

  /**
   * Fetches inventory for multiple dates for all products
   */
  private async fetchInventoryBatch(dates: string[]): Promise<void> {
    for (const productId of this.productIds) {
      // Apply product-specific availability rules
      const filteredDates = dates

      for (const date of filteredDates) {
        try {
          const inventoryData = await this.inventoryApiService.fetchInventory(
            productId,
            date,
          );
          await this.inventoryApiService.saveInventoryData(
            productId,
            date,
            inventoryData,
          );
        } catch (error) {
          this.logger.error(
            `Failed processing product ${productId} for date ${date}`,
            error,
          );
          // Continue with next date even if one fails
        }
      }
    }
  }

  /**
   * Filters dates based on product availability days
   */
  private filterDatesByProductAvailability(
    productId: number,
    dates: string[],
  ): string[] {
    return dates.filter((dateStr) => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

      if (productId === 14) {
        // Available on Monday (1), Tuesday (2), and Wednesday (3)
        return dayOfWeek >= 1 && dayOfWeek <= 3;
      } else if (productId === 15) {
        // Available only on Sunday (0)
        return dayOfWeek === 0;
      }

      return true; // Default to including the date
    });
  }
}
