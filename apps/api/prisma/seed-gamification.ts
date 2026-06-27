import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const badges = [
  ["FIRST_TASK", "First Task", "首次完成任務", "✓"],
  ["ON_TIME_MASTER", "On Time Master", "準時完成 10 次任務", "⏱"],
  ["TEAM_PLAYER", "Team Player", "參與 5 次多人任務", "◎"],
  ["ROLE_EXPERT", "Role Expert", "同一技能需求完成 10 次任務", "◆"],
  ["WEEKLY_CHALLENGER", "Weekly Challenger", "完成每週挑戰", "↻"],
  ["RELIABLE_WORKER", "Reliable Worker", "完成 5 次任務", "▣"],
  ["HIGH_VALUE", "High Value", "累積取得高額 EXP", "★"]
] as const;

const challenges = [
  [
    "WEEKLY_COMPLETE_2",
    "本週完成 2 個任務",
    "本週完成並通過驗收 2 個任務",
    "completed_tasks",
    2,
    100
  ],
  [
    "WEEKLY_ON_TIME_1",
    "本週準時完成 1 個任務",
    "本週準時完成並通過驗收 1 個任務",
    "on_time_tasks",
    1,
    50
  ],
  [
    "WEEKLY_TEAM_1",
    "本週參與 1 個多人任務",
    "本週參與並完成 1 個多人協作任務",
    "team_tasks",
    1,
    80
  ]
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
