DELETE FROM "ProfileTag" WHERE "type" = 'ROLE';

UPDATE "TaskApplication"
SET "status" = 'ACCEPTED'
WHERE "status" = 'APPROVED';

DROP TABLE IF EXISTS "UserTitle";
DROP TABLE IF EXISTS "Title";

ALTER TABLE "ExpTransaction" DROP COLUMN IF EXISTS "roleName";

ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_assigneeId_fkey";
ALTER TABLE "Task" DROP COLUMN IF EXISTS "assigneeId";

ALTER TYPE "ProfileTagType" RENAME TO "ProfileTagType_old";
CREATE TYPE "ProfileTagType" AS ENUM ('SKILL');
ALTER TABLE "ProfileTag"
ALTER COLUMN "type" TYPE "ProfileTagType"
USING "type"::text::"ProfileTagType";
DROP TYPE "ProfileTagType_old";

ALTER TYPE "ApplicationStatus" RENAME TO "ApplicationStatus_old";
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'WAITLIST', 'REJECTED');
ALTER TABLE "TaskApplication"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "ApplicationStatus"
USING "status"::text::"ApplicationStatus",
ALTER COLUMN "status" SET DEFAULT 'PENDING';
DROP TYPE "ApplicationStatus_old";
