-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "notificationSettings" JSONB NOT NULL DEFAULT '{"email":true,"taskUpdates":true,"reviewResults":true}',
ADD COLUMN     "preferredRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "skillTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
