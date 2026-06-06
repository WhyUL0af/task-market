-- CreateEnum
CREATE TYPE "ProfileTagType" AS ENUM ('SKILL', 'ROLE');

-- CreateTable
CREATE TABLE "ProfileTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProfileTagType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfileTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "UserProfileTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfileTag_type_name_key" ON "ProfileTag"("type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfileTag_userId_tagId_key" ON "UserProfileTag"("userId", "tagId");

-- AddForeignKey
ALTER TABLE "UserProfileTag" ADD CONSTRAINT "UserProfileTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfileTag" ADD CONSTRAINT "UserProfileTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ProfileTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
