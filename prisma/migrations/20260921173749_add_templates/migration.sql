/*
  Warnings:

  - You are about to drop the column `template` on the `academy` table. All the data in the column will be lost.
  - Added the required column `templateId` to the `Academy` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Academy` DROP COLUMN `template`,
    ADD COLUMN `templateId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `Template` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Template_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Academy` ADD CONSTRAINT `Academy_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `Template`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
