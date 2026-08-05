-- Phase 3.6: Inventory Adjustment / Material Return
-- Add isActive to InventoryItem, add audit fields, FK constraints and clientTransactionId to InventoryTransaction

-- AlterTable InventoryItem
ALTER TABLE "InventoryItem" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable InventoryTransaction
ALTER TABLE "InventoryTransaction" ADD COLUMN "reason" TEXT;
ALTER TABLE "InventoryTransaction" ADD COLUMN "referenceCode" TEXT;
ALTER TABLE "InventoryTransaction" ADD COLUMN "actedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD COLUMN "inventoryVersionBefore" INTEGER;
ALTER TABLE "InventoryTransaction" ADD COLUMN "inventoryVersionAfter" INTEGER;
ALTER TABLE "InventoryTransaction" ADD COLUMN "clientTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransaction_clientTransactionId_key" ON "InventoryTransaction"("clientTransactionId");
