// src/modules/inventory/inventory.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get available slots for a specific product and date
   */
  async getSlots(productId: number, date: string) {
    try {
      // Check if product exists
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Parse date properly from different possible formats
      let formattedDate: Date;

      if (date.includes('-')) {
        // Already in YYYY-MM-DD format
        formattedDate = new Date(date);
      } else if (date.length === 8) {
        // Format YYYYMMDD to YYYY-MM-DD
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

      // Find availability for the date
      const availability = await this.prisma.availability.findUnique({
        where: {
          productId_date: {
            productId,
            date: formattedDate,
          },
        },
        include: {
          timeSlots: {
            include: {
              paxAvailability: {
                include: {
                  paxType: true,
                },
              },
            },
          },
        },
      });

      if (!availability || !availability.timeSlots.length) {
        return { slots: [] };
      }

      // Transform data to match the expected output format
      const slots = availability.timeSlots.map((slot) => {
        // Find primary pax type for slot price
        const primaryPax =
          slot.paxAvailability.find((pax) => pax.isPrimary) ||
          slot.paxAvailability[0];
        const price = primaryPax
          ? (primaryPax.price as any)
          : {
              finalPrice: 0,
              originalPrice: 0,
              currencyCode: slot.currencyCode,
            };

        return {
          startTime: slot.startTime,
          startDate: date, // Return the date in the same format it was provided
          price: {
            finalPrice: price.finalPrice,
            originalPrice: price.originalPrice,
            currencyCode: price.currencyCode,
          },
          remaining: slot.remaining,
          paxAvailability: slot.paxAvailability.map((pax) => {
            const paxPrice = pax.price as any;
            return {
              type: pax.paxType.type,
              name: pax.paxType.name || undefined,
              description: pax.paxType.description || undefined,
              price: {
                finalPrice: paxPrice.finalPrice,
                originalPrice: paxPrice.originalPrice,
                currencyCode: paxPrice.currencyCode,
              },
              min: pax.min || undefined,
              max: pax.max || undefined,
              remaining: pax.remaining,
            };
          }),
        };
      });

      return { slots };
    } catch (error) {
      this.logger.error(
        `Error fetching slots for product ${productId} on ${date}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get all available dates for a product
   */
  async getDates(productId: number) {
    try {
      // Check if product exists
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Get all availabilities for the next 60 days
      const today = new Date();
      const twoMonthsLater = new Date(today);
      twoMonthsLater.setMonth(today.getMonth() + 2);

      const availabilities = await this.prisma.availability.findMany({
        where: {
          productId,
          date: {
            gte: today,
            lt: twoMonthsLater,
          },
        },
        include: {
          timeSlots: {
            include: {
              paxAvailability: {
                where: {
                  isPrimary: true,
                },
                take: 1,
              },
            },
            take: 1, // We just need one time slot to get the price
          },
        },
        orderBy: {
          date: 'asc',
        },
      });

      // Transform data to match the expected output format
      const dates = availabilities
        .filter((avail) => avail.timeSlots.length > 0) // Only include dates with slots
        .map((avail) => {
          // Try to find a primary pax availability first
          let price;
          const timeSlot = avail.timeSlots[0];

          if (timeSlot.paxAvailability.length > 0) {
            // We have a primary pax availability
            const paxPrice = timeSlot.paxAvailability[0].price as any;
            price = {
              finalPrice: paxPrice.finalPrice,
              originalPrice: paxPrice.originalPrice,
              currencyCode: paxPrice.currencyCode,
            };
          } else {
            // Fallback to using just the currency code from the time slot
            price = {
              finalPrice: 0,
              originalPrice: 0,
              currencyCode: timeSlot.currencyCode,
            };
          }

          // Format date as YYYYMMDD to be consistent with the API
          const year = avail.date.getFullYear();
          const month = String(avail.date.getMonth() + 1).padStart(2, '0');
          const day = String(avail.date.getDate()).padStart(2, '0');
          const formattedDate = `${year}${month}${day}`;

          return {
            date: formattedDate,
            price: price,
          };
        });

      return { dates };
    } catch (error) {
      this.logger.error(
        `Error fetching dates for product ${productId}`,
        error.stack,
      );
      throw error;
    }
  }
}
