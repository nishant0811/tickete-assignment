// src/modules/inventory/inventory.controller.ts
import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('api/v1/experience')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get(':id/slots')
  async getSlots(@Param('id') id: string, @Query('date') date: string) {
    if (!date) {
      throw new NotFoundException('Date parameter is required');
    }
    
    const productId = parseInt(id, 10);
    return this.inventoryService.getSlots(productId, date);
  }

  @Get(':id/dates')
  async getDates(@Param('id') id: string) {
    const productId = parseInt(id, 10);
    return this.inventoryService.getDates(productId);
  }
}