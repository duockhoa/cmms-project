-- Phase 3.7 Follow-up: ScheduleHistory Restrict, FK to WorkOrder, createdById NOT NULL

-- 1. Redefine ScheduleHistory table with onDelete RESTRICT for scheduleId and FK to WorkOrder
CREATE TABLE "new_ScheduleHistory" (
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
    CONSTRAINT "ScheduleHistory_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "MaintenanceSchedule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ScheduleHistory_actedById_fkey" FOREIGN KEY ("actedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ScheduleHistory_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Copy data from existing ScheduleHistory table
INSERT INTO "new_ScheduleHistory" (
    "id", "scheduleId", "action", "fromStatus", "toStatus", "reason", "actedById", "versionBefore", "versionAfter", "workOrderId", "createdAt"
)
SELECT
    "id", "scheduleId", "action", "fromStatus", "toStatus", "reason", "actedById", "versionBefore", "versionAfter", "workOrderId", "createdAt"
FROM "ScheduleHistory";

DROP TABLE "ScheduleHistory";
ALTER TABLE "new_ScheduleHistory" RENAME TO "ScheduleHistory";
CREATE INDEX "ScheduleHistory_scheduleId_createdAt_idx" ON "ScheduleHistory"("scheduleId", "createdAt");

-- 2. Backfill any null createdById in MaintenanceSchedule with first active user before making createdById NOT NULL
UPDATE "MaintenanceSchedule"
SET "createdById" = (SELECT "id" FROM "User" WHERE "isActive" = 1 LIMIT 1)
WHERE "createdById" IS NULL;

-- 3. Redefine MaintenanceSchedule table to make createdById NOT NULL with onDelete RESTRICT
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
    "createdById" TEXT NOT NULL,
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
    CONSTRAINT "MaintenanceSchedule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceSchedule_pausedById_fkey" FOREIGN KEY ("pausedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceSchedule_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_MaintenanceSchedule" (
    "id", "scheduleCode", "title", "description", "equipmentId", "status", "frequencyType", "frequencyInterval",
    "startDate", "nextDueDate", "lastGeneratedAt", "lastCompletedAt", "endDate", "estimatedDurationMinutes",
    "defaultPriority", "assignedTechnicianId", "createdById", "version", "createdAt", "updatedAt",
    "pausedAt", "pausedById", "pauseReason", "cancelledAt", "cancelledById", "cancelReason",
    "leadTimeDays", "autoGenerate", "notes", "checklistJson", "anchorDayOfMonth", "lastTriggerMeter", "nextDueMeter"
)
SELECT
    "id", "scheduleCode", "title", "description", "equipmentId", "status", "frequencyType", "frequencyInterval",
    "startDate", "nextDueDate", "lastGeneratedAt", "lastCompletedAt", "endDate", "estimatedDurationMinutes",
    "defaultPriority", "assignedTechnicianId", "createdById", "version", "createdAt", "updatedAt",
    "pausedAt", "pausedById", "pauseReason", "cancelledAt", "cancelledById", "cancelReason",
    "leadTimeDays", "autoGenerate", "notes", "checklistJson", "anchorDayOfMonth", "lastTriggerMeter", "nextDueMeter"
FROM "MaintenanceSchedule";

DROP TABLE "MaintenanceSchedule";
ALTER TABLE "new_MaintenanceSchedule" RENAME TO "MaintenanceSchedule";

CREATE UNIQUE INDEX "MaintenanceSchedule_scheduleCode_key" ON "MaintenanceSchedule"("scheduleCode");
CREATE INDEX "MaintenanceSchedule_status_nextDueDate_idx" ON "MaintenanceSchedule"("status", "nextDueDate");
CREATE INDEX "MaintenanceSchedule_equipmentId_idx" ON "MaintenanceSchedule"("equipmentId");
CREATE INDEX "MaintenanceSchedule_assignedTechnicianId_idx" ON "MaintenanceSchedule"("assignedTechnicianId");
CREATE INDEX "MaintenanceSchedule_frequencyType_idx" ON "MaintenanceSchedule"("frequencyType");
