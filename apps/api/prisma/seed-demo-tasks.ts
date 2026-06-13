import * as bcrypt from "bcryptjs";
import { PrismaClient, TaskDifficulty, TaskStatus } from "@prisma/client";

const prisma = new PrismaClient();

const skills = ["前端", "後端", "資料庫", "UI 設計", "QA 測試", "文件撰寫"];

const tasks = [
  {
    title: "會員登入流程優化",
    description: "調整登入、註冊與錯誤提示流程。",
    reward: 6000,
    xpReward: 300,
    difficulty: TaskDifficulty.MEDIUM,
    requirements: [
      { name: "前端需求", headcount: 1, budgetPercent: 50, xpPercent: 50, skills: ["前端"] },
      { name: "後端需求", headcount: 1, budgetPercent: 50, xpPercent: 50, skills: ["後端"] }
    ]
  },
  {
    title: "任務列表篩選改善",
    description: "改善搜尋、排序、分頁與篩選體驗。",
    reward: 4500,
    xpReward: 250,
    difficulty: TaskDifficulty.EASY,
    requirements: [
      { name: "前端需求", headcount: 1, budgetPercent: 70, xpPercent: 70, skills: ["前端"] },
      { name: "測試需求", headcount: 1, budgetPercent: 30, xpPercent: 30, skills: ["QA 測試"] }
    ]
  },
  {
    title: "管理者使用者編輯功能",
    description: "整理使用者資料、權限、技能與稱號設定。",
    reward: 7000,
    xpReward: 400,
    difficulty: TaskDifficulty.MEDIUM,
    requirements: [
      { name: "後端需求", headcount: 1, budgetPercent: 60, xpPercent: 60, skills: ["後端", "資料庫"] },
      { name: "前端需求", headcount: 1, budgetPercent: 40, xpPercent: 40, skills: ["前端"] }
    ]
  },
  {
    title: "任務詳情頁版面整理",
    description: "調整任務資訊、錄取人員、提交紀錄與審核區塊。",
    reward: 5000,
    xpReward: 280,
    difficulty: TaskDifficulty.MEDIUM,
    requirements: [
      { name: "UI 需求", headcount: 1, budgetPercent: 50, xpPercent: 50, skills: ["UI 設計"] },
      { name: "前端需求", headcount: 1, budgetPercent: 50, xpPercent: 50, skills: ["前端"] }
    ]
  },
  {
    title: "每週挑戰資料檢查",
    description: "確認挑戰進度、完成狀態與 EXP 發放紀錄。",
    reward: 3500,
    xpReward: 200,
    difficulty: TaskDifficulty.EASY,
    requirements: [
      { name: "測試需求", headcount: 1, budgetPercent: 100, xpPercent: 100, skills: ["QA 測試"] }
    ]
  },
  {
    title: "排行榜資料驗證",
    description: "確認本月 EXP、完成任務、準時率與協作榜資料。",
    reward: 4000,
    xpReward: 220,
    difficulty: TaskDifficulty.EASY,
    requirements: [
      { name: "資料需求", headcount: 1, budgetPercent: 50, xpPercent: 50, skills: ["資料庫"] },
      { name: "測試需求", headcount: 1, budgetPercent: 50, xpPercent: 50, skills: ["QA 測試"] }
    ]
  },
  {
    title: "通知設定頁面整理",
    description: "整理通知選項儲存與顯示狀態。",
    reward: 3000,
    xpReward: 180,
    difficulty: TaskDifficulty.EASY,
    requirements: [
      { name: "前端需求", headcount: 1, budgetPercent: 100, xpPercent: 100, skills: ["前端"] }
    ]
  },
  {
    title: "任務驗收流程測試",
    description: "測試提交、退回、再次提交、驗收與結案流程。",
    reward: 6500,
    xpReward: 350,
    difficulty: TaskDifficulty.HARD,
    requirements: [
      { name: "測試需求", headcount: 2, budgetPercent: 100, xpPercent: 100, skills: ["QA 測試"] }
    ]
  },
  {
    title: "資料庫索引與查詢檢查",
    description: "檢查任務、申請、提交與遊戲化資料查詢。",
    reward: 8000,
    xpReward: 500,
    difficulty: TaskDifficulty.HARD,
    requirements: [
      { name: "後端需求", headcount: 1, budgetPercent: 50, xpPercent: 50, skills: ["後端"] },
      { name: "資料需求", headcount: 1, budgetPercent: 50, xpPercent: 50, skills: ["資料庫"] }
    ]
  },
  {
    title: "操作文件整理",
    description: "整理啟動、測試與部署操作文件。",
    reward: 2500,
    xpReward: 150,
    difficulty: TaskDifficulty.EASY,
    requirements: [
      { name: "文件需求", headcount: 1, budgetPercent: 100, xpPercent: 100, skills: ["文件撰寫"] }
    ]
  }
];

async function main() {
  const creator = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" }
  });

  const admin =
    creator ??
    (await prisma.user.create({
      data: {
        email: "admin@yuloaf.work",
        name: "Admin",
        role: "ADMIN",
        passwordHash: await bcrypt.hash("password123", 10)
      }
    }));

  const skillTags = new Map<string, string>();
  for (const name of skills) {
    const tag = await prisma.profileTag.upsert({
      where: { type_name: { type: "SKILL", name } },
      update: {},
      create: { type: "SKILL", name }
    });
    skillTags.set(name, tag.id);
  }

  let created = 0;
  for (const task of tasks) {
    const exists = await prisma.task.findFirst({ where: { title: task.title } });
    if (exists) {
      continue;
    }
    await prisma.task.create({
      data: {
        title: task.title,
        description: task.description,
        reward: task.reward,
        xpReward: task.xpReward,
        difficulty: task.difficulty,
        status: TaskStatus.OPEN,
        creatorId: admin.id,
        requirements: {
          create: task.requirements.map((requirement) => ({
            name: requirement.name,
            headcount: requirement.headcount,
            budgetPercent: requirement.budgetPercent,
            xpPercent: requirement.xpPercent,
            skills: {
              create: requirement.skills.map((skillName) => ({
                skillTagId: skillTags.get(skillName)!
              }))
            }
          }))
        }
      }
    });
    created += 1;
  }

  console.log(`Created ${created} demo tasks.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
