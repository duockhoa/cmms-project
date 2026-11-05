-- Review/apply separately. Preserve every existing disabled account as locally blocked.
-- No account identity, role, author, email or historical relation is rewritten.
ALTER TABLE `User`
  ADD COLUMN `accessBlocked` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `hrmIsActive` BOOLEAN NULL;
UPDATE `User` SET `accessBlocked` = true WHERE `isActive` = false;
