ALTER TABLE `BrowserSession`
  ADD COLUMN `accessToken` TEXT NULL,
  ADD COLUMN `refreshedAt` DATETIME(3) NULL,
  ADD COLUMN `state` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN `source` VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN `tokenOwnership` VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN',
  ADD INDEX `BrowserSession_hrmId_state_idx` (`hrmId`, `state`);

CREATE TABLE `BrowserAuthOperation` (
  `id` VARCHAR(64) NOT NULL,
  `fingerprint` VARCHAR(64) NOT NULL,
  `result` TEXT NULL,
  `sessionId` VARCHAR(64) NULL,
  `state` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  `expiresAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `BrowserAuthOperation_expiresAt_idx` (`expiresAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `HrmRevocationTask` (
  `id` VARCHAR(64) NOT NULL,
  `hrmId` VARCHAR(191) NOT NULL,
  `refreshToken` TEXT NOT NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `availableAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `HrmRevocationTask_availableAt_idx` (`availableAt`),
  INDEX `HrmRevocationTask_expiresAt_idx` (`expiresAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
