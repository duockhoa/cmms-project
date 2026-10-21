-- Track HRM identity and snapshot membership so deleted HRM employees can be deactivated safely.
ALTER TABLE `User`
  ADD COLUMN `hrmId` VARCHAR(191) NULL,
  ADD COLUMN `dataSource` ENUM('LOCAL', 'HRM') NOT NULL DEFAULT 'LOCAL',
  ADD COLUMN `lastHrmSyncedAt` DATETIME(3) NULL;

CREATE UNIQUE INDEX `User_hrmId_key` ON `User`(`hrmId`);
CREATE INDEX `User_dataSource_isActive_idx` ON `User`(`dataSource`, `isActive`);
