ALTER TABLE `User` ADD COLUMN `mergedIntoId` VARCHAR(191) NULL,
  ADD COLUMN `mergedAt` DATETIME(3) NULL;
CREATE INDEX `User_mergedIntoId_idx` ON `User` (`mergedIntoId`);
ALTER TABLE `User` ADD CONSTRAINT `User_mergedIntoId_fkey`
  FOREIGN KEY (`mergedIntoId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `UserMergePreview` (
  `id` VARCHAR(191) NOT NULL,
  `sourceUserId` VARCHAR(191) NOT NULL,
  `targetUserId` VARCHAR(191) NOT NULL,
  `actorUserId` VARCHAR(191) NOT NULL,
  `fingerprint` VARCHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `consumedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`), INDEX `UserMergePreview_expiresAt_idx` (`expiresAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `UserMergeAudit` (
  `id` VARCHAR(191) NOT NULL,
  `previewId` VARCHAR(191) NOT NULL,
  `sourceUserId` VARCHAR(191) NOT NULL,
  `targetUserId` VARCHAR(191) NOT NULL,
  `actorUserId` VARCHAR(191) NOT NULL,
  `reason` TEXT NOT NULL,
  `evidence` TEXT NOT NULL,
  `sourceSnapshot` JSON NOT NULL,
  `targetSnapshot` JSON NOT NULL,
  `changes` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`), UNIQUE INDEX `UserMergeAudit_previewId_key` (`previewId`),
  INDEX `UserMergeAudit_sourceUserId_idx` (`sourceUserId`),
  INDEX `UserMergeAudit_targetUserId_createdAt_idx` (`targetUserId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
