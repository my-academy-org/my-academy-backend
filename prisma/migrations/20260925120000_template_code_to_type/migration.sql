-- Replace Template.code with Template.type (TemplateType enum).
-- Template ids are unchanged, so Academy.templateId relations are preserved.

-- 1. Add `type` as nullable so existing rows are not rejected.
ALTER TABLE `Template` ADD COLUMN `type` ENUM('MODERN', 'EDUCATION', 'CORPORATE') NULL;

-- 2. Backfill `type` from the existing `code` values.
--    The legacy 'DEFAULT' template (used by existing academies) becomes MODERN;
--    its id is kept, so Academy.templateId still points to it.
UPDATE `Template`
SET `type` = 'MODERN', `name` = 'Modern'
WHERE UPPER(TRIM(`code`)) = 'DEFAULT';

UPDATE `Template`
SET `type` = UPPER(TRIM(`code`))
WHERE UPPER(TRIM(`code`)) IN ('MODERN', 'EDUCATION', 'CORPORATE');

-- 3. Make `type` required and unique.
--    If any Template row has a `code` that does not map to MODERN/EDUCATION/CORPORATE,
--    this statement fails and `code` is NOT dropped. Fix those rows manually, then re-run.
ALTER TABLE `Template` MODIFY `type` ENUM('MODERN', 'EDUCATION', 'CORPORATE') NOT NULL;
CREATE UNIQUE INDEX `Template_type_key` ON `Template`(`type`);

-- 4. Drop the old `code` column.
DROP INDEX `Template_code_key` ON `Template`;
ALTER TABLE `Template` DROP COLUMN `code`;
