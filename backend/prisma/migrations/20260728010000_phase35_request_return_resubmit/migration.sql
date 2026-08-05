-- Phase 3.5: Request Return/Resubmit/Cancel
-- Add fields to MaintenanceRequest for return/cancel tracking

-- AlterTable MaintenanceRequest
ALTER TABLE "MaintenanceRequest" ADD COLUMN "returnedReason" TEXT;
ALTER TABLE "MaintenanceRequest" ADD COLUMN "cancelledReason" TEXT;
ALTER TABLE "MaintenanceRequest" ADD COLUMN "cancelledAt" DATETIME;
ALTER TABLE "MaintenanceRequest" ADD COLUMN "cancelledById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable WorkflowHistory
ALTER TABLE "WorkflowHistory" ADD COLUMN "actedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkflowHistory" ADD COLUMN "requestVersionBefore" INTEGER;
ALTER TABLE "WorkflowHistory" ADD COLUMN "requestVersionAfter" INTEGER;
