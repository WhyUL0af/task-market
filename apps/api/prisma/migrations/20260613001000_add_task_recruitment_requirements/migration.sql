DROP TABLE IF EXISTS "TaskSkillRequirement";

CREATE TABLE "TaskRequirement" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "headcount" INTEGER NOT NULL DEFAULT 1,
    "budgetPercent" INTEGER NOT NULL DEFAULT 0,
    "xpPercent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,

    CONSTRAINT "TaskRequirement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskRequirementSkill" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "skillTagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskRequirementSkill_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TaskApplication"
ADD COLUMN IF NOT EXISTS "requirementId" TEXT;

CREATE INDEX "TaskRequirement_taskId_idx" ON "TaskRequirement"("taskId");
CREATE INDEX "TaskRequirementSkill_skillTagId_idx" ON "TaskRequirementSkill"("skillTagId");
CREATE UNIQUE INDEX "TaskRequirementSkill_requirementId_skillTagId_key"
ON "TaskRequirementSkill"("requirementId", "skillTagId");
CREATE INDEX "TaskApplication_requirementId_idx" ON "TaskApplication"("requirementId");

ALTER TABLE "TaskRequirement"
ADD CONSTRAINT "TaskRequirement_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskRequirementSkill"
ADD CONSTRAINT "TaskRequirementSkill_requirementId_fkey"
FOREIGN KEY ("requirementId") REFERENCES "TaskRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskRequirementSkill"
ADD CONSTRAINT "TaskRequirementSkill_skillTagId_fkey"
FOREIGN KEY ("skillTagId") REFERENCES "ProfileTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskApplication"
ADD CONSTRAINT "TaskApplication_requirementId_fkey"
FOREIGN KEY ("requirementId") REFERENCES "TaskRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
