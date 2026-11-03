-- Additive migration for an existing EquipmentOeeRecord table.
-- Historical calculation snapshots are preserved; use oee:backfill after migration.
ALTER TABLE `EquipmentOeeRecord`
  ADD COLUMN `productCode` VARCHAR(191) NULL,
  ADD COLUMN `productGroup` VARCHAR(191) NULL,
  ADD COLUMN `batchOeeId` TEXT NULL,
  ADD COLUMN `pa2PlanTimeMinutes` DOUBLE NULL;

CREATE INDEX `EquipmentOeeRecord_batchOeeId_idx` ON `EquipmentOeeRecord`(`batchOeeId`(191));

CREATE TABLE `ProductSpeedConfig` (
  `id` VARCHAR(191) NOT NULL,
  `equipmentId` VARCHAR(191) NOT NULL,
  `productGroup` VARCHAR(191) NOT NULL,
  `speedPerHour` DOUBLE NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ProductSpeedConfig_equipmentId_productGroup_key` (`equipmentId`, `productGroup`),
  CONSTRAINT `ProductSpeedConfig_equipmentId_fkey` FOREIGN KEY (`equipmentId`)
    REFERENCES `Equipment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
