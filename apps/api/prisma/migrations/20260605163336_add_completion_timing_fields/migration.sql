-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "dueAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TaskApplication" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "onTime" BOOLEAN;
