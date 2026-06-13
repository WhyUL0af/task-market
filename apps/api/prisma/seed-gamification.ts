import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const badges = [
  ["FIRST_TASK", "首次完成", "第一次完成並通過驗收的任務。", "1st"],
  ["ON_TIME_MASTER", "準時達人", "準時完成 10 次任務。", "10x"],
  ["TEAM_PLAYER", "團隊核心", "參與並完成 5 次多人任務。", "Team"],
  ["ROLE_EXPERT", "技能專家", "在同類技能需求中累積完成 10 次任務。", "Skill"],
  ["WEEKLY_CHALLENGER", "每週挑戰者", "完成任一每週挑戰。", "Week"],
  ["RELIABLE_WORKER", "穩定能手", "完成 5 次任務。", "5x"],
  ["HIGH_VALUE", "高價值貢獻", "累積取得大量 EXP。", "HV"]
] as const;

const challenges = [
  ["WEEKLY_COMPLETE_2", "本週完成 2 個任務", "本週完成並通過驗收 2 個任務。", "completed_tasks", 2, 100],
  ["WEEKLY_ON_TIME_1", "本週準時完成 1 個任務", "本週準時完成並通過驗收 1 個任務。", "on_time_tasks", 1, 50],
  ["WEEKLY_TEAM_1", "本週參與 1 個多人任務", "本週完成 1 個多人協作任務。", "team_tasks", 1, 80]
] as const;

async function main() {
  for (const [code, name, description, icon] of badges) {
    await prisma.badge.upsert({
      where: { code },
      update: { name, description, icon },
      create: { code, name, description, icon }
    });
  }

  for (const [code, title, description, metric, target, expReward] of challenges) {
    await prisma.weeklyChallenge.upsert({
      where: { code },
      update: {
        title,
        description,
        metric,
        target,
        expReward,
        active: true
      },
      create: {
        code,
        title,
        description,
        metric,
        target,
        expReward,
        active: true
      }
    });
  }

  console.log("Gamification defaults ready");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
