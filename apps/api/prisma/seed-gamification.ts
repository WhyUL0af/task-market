import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const badges = [
  ["FIRST_TASK", "首次完成", "首次完成任務", "1st"],
  ["ON_TIME_MASTER", "準時大師", "準時完成 10 次任務", "10x"],
  ["TEAM_PLAYER", "團隊合作者", "參與 5 次多人任務", "Team"],
  ["ROLE_EXPERT", "領域專家", "同一角色完成 10 次任務", "Role"],
  ["WEEKLY_CHALLENGER", "每週挑戰者", "完成每週挑戰", "Week"],
  ["RELIABLE_WORKER", "可靠夥伴", "完成 5 個任務。", "5x"],
  ["HIGH_VALUE", "卓越價值", "完成高 XP 任務。", "HV"]
];

const titles = [
  ["NEW_ADVENTURER", "新人冒險者", "完成第一個任務"],
  ["ON_TIME_PRO", "準時達人", "準時完成任務的可靠夥伴"],
  ["FRONTEND_EXPERT", "Frontend 專家", "前端角色完成度達標"],
  ["BACKEND_EXPERT", "Backend 專家", "後端角色完成度達標"],
  ["TEAM_CORE", "團隊核心", "多人協作任務表現穩定"],
  ["TASK_MASTER", "任務大師", "累積完成大量任務"]
];

const challenges = [
  ["WEEKLY_COMPLETE_2", "本週完成 2 個任務", "完成任務數達到 2", "completed_tasks", 2, 100],
  ["WEEKLY_ON_TIME_1", "本週準時完成 1 個任務", "準時完成任務數達到 1", "on_time_tasks", 1, 50],
  ["WEEKLY_TEAM_1", "本週參與 1 個多人任務", "多人協作任務完成數達到 1", "team_tasks", 1, 80]
];

async function main() {
  for (const [code, name, description, icon] of badges) {
    await prisma.badge.upsert({
      where: { code },
      update: { name, description, icon },
      create: { code, name, description, icon }
    });
  }

  for (const [code, name, description] of titles) {
    await prisma.title.upsert({
      where: { code },
      update: { name, description },
      create: { code, name, description }
    });
  }

  for (const [code, title, description, metric, target, expReward] of challenges) {
    await prisma.weeklyChallenge.upsert({
      where: { code: String(code) },
      update: {
        title: String(title),
        description: String(description),
        metric: String(metric),
        target: Number(target),
        expReward: Number(expReward),
        active: true
      },
      create: {
        code: String(code),
        title: String(title),
        description: String(description),
        metric: String(metric),
        target: Number(target),
        expReward: Number(expReward),
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
