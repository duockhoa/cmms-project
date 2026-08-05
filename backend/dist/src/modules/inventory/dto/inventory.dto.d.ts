export declare class CreateInventoryItemDto {
    itemCode?: string;
    name: string;
    category: string;
    quantity?: number;
    unit?: string;
    minQuantity?: number;
    unitPrice?: number;
    location?: string;
}
export declare class AdjustInventoryStockDto {
    changeQuantity: number;
    expectedVersion?: number;
}
export declare class AdjustInDto {
    quantity: number;
    reason: string;
    referenceCode?: string;
    expectedVersion: number;
    actedById: string;
    clientTransactionId?: string;
}
export declare class AdjustOutDto {
    quantity: number;
    reason: string;
    referenceCode?: string;
    expectedVersion: number;
    actedById: string;
    clientTransactionId?: string;
}
export declare class MaterialReturnDto {
    inventoryItemId: string;
    quantity: number;
    reason: string;
    workOrderItemId: string;
    expectedInventoryVersion: number;
    expectedWorkOrderVersion: number;
    actedById: string;
    clientTransactionId?: string;
}
export declare class UpdateInventoryItemDto {
    name?: string;
    category?: string;
    quantity?: number;
    unit?: string;
    minQuantity?: number;
    unitPrice?: number;
    location?: string;
    expectedVersion: number;
}
