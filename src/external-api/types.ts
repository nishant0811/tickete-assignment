export interface Price {
  discount: number;
  finalPrice: number;
  originalPrice: number;
  currencyCode: string;
}

export interface PaxAvailability {
  max: number;
  min: number;
  remaining: number;
  type: string;
  isPrimary?: boolean;
  description: string;
  name: string;
  price: Price;
}

export interface TimeSlot {
  startDate: string;
  startTime: string;
  endTime: string;
  providerSlotId: string;
  remaining: number;
  currencyCode: string;
  variantId: number;
  paxAvailability: PaxAvailability[];
}

export type InventoryResponse = TimeSlot[];

// Output API types based on the project requirements
export interface SlotOutputPrice {
  finalPrice: number;
  currencyCode: string;
  originalPrice: number;
}

export interface SlotOutputPaxAvailability {
  type: string;
  name?: string;
  description?: string;
  price: SlotOutputPrice;
  min?: number;
  max?: number;
  remaining: number;
}

export interface SlotOutput {
  startTime: string;
  startDate: string;
  price: SlotOutputPrice;
  remaining: number;
  paxAvailability: SlotOutputPaxAvailability[];
}

export interface SlotsResponse {
  slots: SlotOutput[];
}

export interface DateAvailability {
  date: string;
  price: SlotOutputPrice;
}

export interface DateInventory {
  dates: DateAvailability[];
}
