-- AlterTable
ALTER TABLE "TaskApplication" ADD COLUMN     "roleRequirementId" TEXT;

-- CreateTable
CREATE TABLE "TaskRoleRequirement" (
    "id" TEXT NOT NULL,
    "budgetPercent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,
    "roleTagId" TEXT NOT NULL,
    "assigneeId" TEXT,

    CONSTRAINT "TaskRoleRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskRoleRequirement_taskId_roleTagId_key" ON "TaskRoleRequirement"("taskId", "roleTagId");

-- AddForeignKey
ALTER TABLE "TaskRoleRequirement" ADD CONSTRAINT "TaskRoleRequirement_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRoleRequirement" ADD CONSTRAINT "TaskRoleRequirement_roleTagId_fkey" FOREIGN KEY ("roleTagId") REFERENCES "ProfileTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRoleRequirement" ADD CONSTRAINT "TaskRoleRequirement_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskApplication" ADD CONSTRAINT "TaskApplication_roleRequirementId_fkey" FOREIGN KEY ("roleRequirementId") REFERENCES "TaskRoleRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
