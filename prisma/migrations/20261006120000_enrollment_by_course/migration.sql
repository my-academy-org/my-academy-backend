-- Enrollment and EnrollmentCode now belong to a Course instead of a Lesson:
-- a student enrolls in a course once and gets all of its lessons.

-- 1. Add `courseId` as nullable so existing rows are not rejected.
ALTER TABLE `EnrollmentCode` ADD COLUMN `courseId` INTEGER NULL;
ALTER TABLE `Enrollment` ADD COLUMN `courseId` INTEGER NULL;

-- 2. Backfill `courseId` from the lesson each row pointed to.
UPDATE `EnrollmentCode` ec
JOIN `Lesson` l ON l.`id` = ec.`lessonId`
SET ec.`courseId` = l.`courseId`;

UPDATE `Enrollment` e
JOIN `Lesson` l ON l.`id` = e.`lessonId`
SET e.`courseId` = l.`courseId`;

-- 3. A student enrolled in several lessons of one course now has several rows
--    for that course. Keep one per (student, course): a non-cancelled row wins
--    over a cancelled one, then the oldest wins.
DELETE e1 FROM `Enrollment` e1
JOIN `Enrollment` e2
  ON e2.`studentId` = e1.`studentId`
 AND e2.`courseId` = e1.`courseId`
 AND e2.`id` <> e1.`id`
WHERE (e1.`status` = 'CANCELLED' AND e2.`status` <> 'CANCELLED')
   OR ((e1.`status` = 'CANCELLED') = (e2.`status` = 'CANCELLED') AND e2.`id` < e1.`id`);

-- 4. Make `courseId` required.
ALTER TABLE `EnrollmentCode` MODIFY `courseId` INTEGER NOT NULL;
ALTER TABLE `Enrollment` MODIFY `courseId` INTEGER NOT NULL;

-- 5. New indexes and foreign keys.
--    Created before the old ones are dropped: `Enrollment_studentId_fkey`
--    needs an index that starts with `studentId` to exist at all times.
CREATE INDEX `EnrollmentCode_courseId_idx` ON `EnrollmentCode`(`courseId`);
CREATE INDEX `EnrollmentCode_courseId_status_idx` ON `EnrollmentCode`(`courseId`, `status`);
CREATE INDEX `Enrollment_courseId_idx` ON `Enrollment`(`courseId`);
CREATE UNIQUE INDEX `Enrollment_studentId_courseId_key` ON `Enrollment`(`studentId`, `courseId`);

ALTER TABLE `EnrollmentCode` ADD CONSTRAINT `EnrollmentCode_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Enrollment` ADD CONSTRAINT `Enrollment_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. Drop the old `lessonId` foreign keys, indexes and columns.
ALTER TABLE `EnrollmentCode` DROP FOREIGN KEY `EnrollmentCode_lessonId_fkey`;
ALTER TABLE `Enrollment` DROP FOREIGN KEY `Enrollment_lessonId_fkey`;

DROP INDEX `EnrollmentCode_lessonId_status_idx` ON `EnrollmentCode`;
DROP INDEX `EnrollmentCode_lessonId_idx` ON `EnrollmentCode`;
DROP INDEX `Enrollment_studentId_lessonId_key` ON `Enrollment`;
DROP INDEX `Enrollment_lessonId_idx` ON `Enrollment`;

ALTER TABLE `EnrollmentCode` DROP COLUMN `lessonId`;
ALTER TABLE `Enrollment` DROP COLUMN `lessonId`;
