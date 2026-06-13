-- DropIndex
DROP INDEX IF EXISTS "TaskApplication_taskId_applicantId_roleRequirementId_key";

-- CreateIndex
CREATE UNIQUE INDEX "TaskApplication_taskId_applicantId_key" ON "TaskApplication"("taskId", "applicantId");
