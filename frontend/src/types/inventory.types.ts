export interface InventoryItem {
  id: string;
  itemCode?: string;
  name: string;
  category: string;
  quantity: number;
  unit?: string;
  minQuantity?: number;
  unitPrice?: number;
  location?: string;
  version: number;
}

export type TransactionType = 'ADJUST_IN' | 'ADJUST_OUT' | 'MATERIAL_RETURN' | 'WORK_ORDER_USE';

export interface InventoryTransaction {
  id: string;
  inventoryItemId: string;
  transactionType: TransactionType;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  reason?: string;
  referenceCode?: string;
  actedById?: string;
  createdAt: string;
}
