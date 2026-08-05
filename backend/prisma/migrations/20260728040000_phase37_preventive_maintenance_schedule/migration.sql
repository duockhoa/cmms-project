-- Phase 3.7: Preventive Maintenance Schedule & ScheduleHistory

-- 1. Create ScheduleHistory table
CREATE TABLE "ScheduleHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "reason" TEXT,
    "actedById" TEXT,
    "versionBefore" INTEGER,
    "versionAfter" INTEGER,
    "workOrderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScheduleHistory_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "MaintenanceSchedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduleHistory_actedById_fkey" FOREIGN KEY ("actedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 2. Add columns to Equipment
ALTER TABLE "Equipment" ADD COLUMN "currentOperatingHours" REAL NOT NULL DEFAULT 0;

-- 3. Add columns to WorkOrder
ALTER TABLE "WorkOrder" ADD COLUMN "scheduledDueMeter" REAL;
ALTER TABLE "WorkOrder" ADD COLUMN "generationKey" TEXT;

CREATE UNIQUE INDEX "WorkOrder_generationKey_key" ON "WorkOrder"("generationKey");

-- 4. Recreate MaintenanceSchedule table with updated structure
CREATE TABLE "new_MaintenanceSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "equipmentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "frequencyType" TEXT NOT NULL,
    "frequencyInterval" INTEGER NOT NULL DEFAULT 1,
    "startDate" DATETIME NOT NULL,
    "nextDueDate" DATETIME,
    "lastGeneratedAt" DATETIME,
    "lastCompletedAt" DATETIME,
    "endDate" DATETIME,
    "estimatedDurationMinutes" INTEGER,
    "defaultPriority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "assignedTechnicianId" TEXT,
    "createdById" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" DATETIME,
    "pausedById" TEXT,
    "pauseReason" TEXT,
    "cancelledAt" DATETIME,
    "cancelledById" TEXT,
    "cancelReason" TEXT,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 0,
    "autoGenerate" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "checklistJson" TEXT,
    "anchorDayOfMonth" INTEGER,
    "lastTriggerMeter" REAL,
    "nextDueMeter" REAL,
    CONSTRAINT "MaintenanceSchedule_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceSchedule_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceSchedule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceSchedule_pausedById_fkey" FOREIGN KEY ("pausedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceSchedule_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Copy data from existing MaintenanceSchedule if any
INSERT INTO "new_MaintenanceSchedule" (
    "id", "scheduleCode", "title", "equipmentId", "status", "frequencyType", "frequencyInterval",
    "startDate", "nextDueDate", "lastGeneratedAt", "version", "createdAt", "updatedAt", "checklistJson"
)
SELECT
    "id",
    'MS-2026-' || SUBSTR("id", 1, 6),
    "title",
    "equipmentId",
    CASE WHEN "isActive" = 1 THEN 'ACTIVE' ELSE 'PAUSED' END,
    "frequency",
    1,
    "createdAt",
    "nextDueDate",
    "lastGeneratedAt",
    "version",
    "createdAt",
    CURRENT_TIMESTAMP,
    "checklistJson"
FROM "MaintenanceSchedule";

DROP TABLE "MaintenanceSchedule";
ALTER TABLE "new_MaintenanceSchedule" RENAME TO "MaintenanceSchedule";

-- 5. Create Indexes
CREATE UNIQUE INDEX "MaintenanceSchedule_scheduleCode_key" ON "MaintenanceSchedule"("scheduleCode");
CREATE INDEX "MaintenanceSchedule_status_nextDueDate_idx" ON "MaintenanceSchedule"("status", "nextDueDate");
CREATE INDEX "MaintenanceSchedule_equipmentId_idx" ON "MaintenanceSchedule"("equipmentId");
CREATE INDEX "MaintenanceSchedule_assignedTechnicianId_idx" ON "MaintenanceSchedule"("assignedTechnicianId");
CREATE INDEX "MaintenanceSchedule_frequencyType_idx" ON "MaintenanceSchedule"("frequencyType");
CREATE INDEX "ScheduleHistory_scheduleId_createdAt_idx" ON "ScheduleHistory"("scheduleId", "createdAt");
