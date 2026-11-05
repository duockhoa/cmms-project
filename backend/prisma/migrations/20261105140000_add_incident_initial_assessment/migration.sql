-- AlterTable MaintenanceRequest add initialRespondedAt
ALTER TABLE `MaintenanceRequest` ADD COLUMN `initialRespondedAt` DATETIME(3) NULL;
CREATE INDEX `MaintenanceRequest_initialRespondedAt_idx` ON `MaintenanceRequest`(`initialRespondedAt`);

-- AlterTable WorkOrder add initialRespondedAt
ALTER TABLE `WorkOrder` ADD COLUMN `initialRespondedAt` DATETIME(3) NULL;

-- CreateTable IncidentInitialAssessment
CREATE TABLE `IncidentInitialAssessment` (
    `id` VARCHAR(191) NOT NULL,
    `workOrderId` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NULL,
    `assessedById` VARCHAR(191) NOT NULL,
    `assessorName` VARCHAR(191) NOT NULL,
    `assessorDepartment` VARCHAR(191) NULL,
    `assessedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `responseDurationHours` DOUBLE NULL,
    `isWithinSla4h` BOOLEAN NOT NULL DEFAULT true,
    `actualCondition` TEXT NOT NULL,
    `preliminaryCause` VARCHAR(191) NOT NULL,
    `preliminaryCauseDetail` TEXT NULL,
    `proposedSolution` TEXT NOT NULL,
    `estimatedCompletionMinutes` INTEGER NOT NULL DEFAULT 60,
    `requireSpareParts` BOOLEAN NOT NULL DEFAULT false,
    `sparePartsNeeded` TEXT NULL,
    `images` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `IncidentInitialAssessment_workOrderId_key`(`workOrderId`),
    UNIQUE INDEX `IncidentInitialAssessment_requestId_key`(`requestId`),
    INDEX `IncidentInitialAssessment_assessedAt_idx`(`assessedAt`),
    INDEX `IncidentInitialAssessment_isWithinSla4h_idx`(`isWithinSla4h`),
    INDEX `IncidentInitialAssessment_assessorDepartment_idx`(`assessorDepartment`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `IncidentInitialAssessment` ADD CONSTRAINT `IncidentInitialAssessment_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `WorkOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IncidentInitialAssessment` ADD CONSTRAINT `IncidentInitialAssessment_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `MaintenanceRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IncidentInitialAssessment` ADD CONSTRAINT `IncidentInitialAssessment_assessedById_fkey` FOREIGN KEY (`assessedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

