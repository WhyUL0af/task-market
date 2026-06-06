-- Extend application status for automated allocation results.
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'WAITLIST';

-- Extend task position requirements.
ALTER TABLE "TaskRoleRequirement"
ADD COLUMN IF NOT EXISTS "headcount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "xpPercent" INTEGER NOT NULL DEFAULT 100;

-- Skill requirements for each task position.
CREATE TABLE IF NOT EXISTS "TaskRoleSkill" (
    "id" TEXT NOT NULL,
    "roleRequirementId" TEXT NOT NULL,
    "skillTagId" TEXT NOT NULL,

    CONSTRAINT "TaskRoleSkill_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TaskRoleSkill_roleRequirementId_skillTagId_key"
ON "TaskRoleSkill"("roleRequirementId", "skillTagId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TaskRoleSkill_roleRequirementId_fkey'
  ) THEN
    ALTER TABLE "TaskRoleSkill"
    ADD CONSTRAINT "TaskRoleSkill_roleRequirementId_fkey"
    FOREIGN KEY ("roleRequirementId") REFERENCES "TaskRoleRequirement"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TaskRoleSkill_skillTagId_fkey'
  ) THEN
    ALTER TABLE "TaskRoleSkill"
    ADD CONSTRAINT "TaskRoleSkill_skillTagId_fkey"
    FOREIGN KEY ("skillTagId") REFERENCES "ProfileTag"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Allocation scoring result fields.
ALTER TABLE "TaskApplication"
ADD COLUMN IF NOT EXISTS "skillMatchScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "workloadScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "completionRateScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "finalScore" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "assignedBudget" INTEGER,
ADD COLUMN IF NOT EXISTS "assignedXp" INTEGER;

-- Allow the same employee to apply for multiple positions in the same task.
DROP INDEX IF EXISTS "TaskApplication_taskId_applicantId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "TaskApplication_taskId_applicantId_roleRequirementId_key"
ON "TaskApplication"("taskId", "applicantId", "roleRequirementId");
