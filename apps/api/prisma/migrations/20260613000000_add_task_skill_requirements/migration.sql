CREATE TABLE "TaskSkillRequirement" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "skillTagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskSkillRequirement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskSkillRequirement_taskId_skillTagId_key" ON "TaskSkillRequirement"("taskId", "skillTagId");
CREATE INDEX "TaskSkillRequirement_skillTagId_idx" ON "TaskSkillRequirement"("skillTagId");

ALTER TABLE "TaskSkillRequirement"
ADD CONSTRAINT "TaskSkillRequirement_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskSkillRequirement"
ADD CONSTRAINT "TaskSkillRequirement_skillTagId_fkey"
FOREIGN KEY ("skillTagId") REFERENCES "ProfileTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
