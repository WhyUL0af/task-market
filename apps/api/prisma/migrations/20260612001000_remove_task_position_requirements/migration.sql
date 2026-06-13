ALTER TABLE "TaskApplication" DROP CONSTRAINT IF EXISTS "TaskApplication_roleRequirementId_fkey";
ALTER TABLE "TaskRoleSkill" DROP CONSTRAINT IF EXISTS "TaskRoleSkill_roleRequirementId_fkey";
ALTER TABLE "TaskRoleSkill" DROP CONSTRAINT IF EXISTS "TaskRoleSkill_skillTagId_fkey";
ALTER TABLE "TaskRoleRequirement" DROP CONSTRAINT IF EXISTS "TaskRoleRequirement_assigneeId_fkey";
ALTER TABLE "TaskRoleRequirement" DROP CONSTRAINT IF EXISTS "TaskRoleRequirement_roleTagId_fkey";
ALTER TABLE "TaskRoleRequirement" DROP CONSTRAINT IF EXISTS "TaskRoleRequirement_taskId_fkey";

DROP TABLE IF EXISTS "TaskRoleSkill";
DROP TABLE IF EXISTS "TaskRoleRequirement";

ALTER TABLE "TaskApplication" DROP COLUMN IF EXISTS "roleRequirementId";
