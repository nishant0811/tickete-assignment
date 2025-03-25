// src/scripts/sample-integration.ts
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { InventoryApiService } from '../external-api/inventory.service';
import { PrismaService } from '../database/prisma.service';

/**
 * Generate dates for the next N days in YYYYMMDD format for API requests
 */
function generateDatesForNextDays(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    // Format as YYYYMMDD for the API
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}${month}${day}`;
    
    dates.push(formattedDate);
  }
  
  return dates;
}

async function bootstrap() {
  const logger = new Logger('SampleIntegration');
  
  // Create NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    // Get the services
    const prismaService = app.get(PrismaService);
    const inventoryApiService = app.get(InventoryApiService);
    
    // Product IDs from the assignment
    const productIds = [14, 15];
    
    // Ensure the products exist in the database
    for (const productId of productIds) {
      await prismaService.product.upsert({
        where: { id: productId },
        update: {},
        create: { id: productId },
      });
    }
    
    // Generate dates for the next 7 days in YYYYMMDD format
    const nextSevenDays = generateDatesForNextDays(60);
    logger.log(`Generated dates for next 7 days: ${nextSevenDays.join(', ')}`);
    
    // Process each product
    for (const productId of productIds) {
      logger.log(`Processing product ID: ${productId}`);
      
      // Process each date - let the API determine availability
      for (const date of nextSevenDays) {
        try {
          logger.log(`Fetching inventory for product ${productId} on ${date}...`);
          
          // Make actual API call to fetch inventory data
          const inventoryData = await inventoryApiService.fetchInventory(productId, date);
          
          logger.log(`Received ${Array.isArray(inventoryData) ? inventoryData.length : 0} slots for product ${productId} on ${date}`);
          
          // Only save if we got valid data (some or zero slots)
          if (Array.isArray(inventoryData)) {
            if (inventoryData.length > 0) {
              // Save the fetched data
              await inventoryApiService.saveInventoryData(productId, date, inventoryData);
              logger.log(`Successfully saved ${inventoryData.length} slots for product ${productId} on ${date}`);
            } else {
              logger.log(`No inventory available for product ${productId} on ${date}`);
            }
          } else {
            logger.warn(`Invalid response format for product ${productId} on ${date}`);
          }
        } catch (error) {
          logger.error(`Error processing product ${productId} for date ${date}:`, error.message);
          // Continue with next date even if one fails
        }
      }
    }
    
    logger.log('Integration test complete!');
  } catch (error) {
    logger.error('Error during integration test:', error.stack);
  } finally {
    await app.close();
  }
}

bootstrap();