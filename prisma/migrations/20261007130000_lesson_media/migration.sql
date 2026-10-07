-- A lesson's video is now a row of `Media`, created once the upload succeeds.
ALTER TABLE `Media` MODIFY `size` BIGINT NULL;

ALTER TABLE `Lesson` ADD COLUMN `mediaId` INTEGER NULL;
CREATE UNIQUE INDEX `Lesson_mediaId_key` ON `Lesson`(`mediaId`);
ALTER TABLE `Lesson` ADD CONSTRAINT `Lesson_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `Media`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
