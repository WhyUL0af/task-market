import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type RequirementSeed = {
  role: string;
  headcount: number;
  budgetPercent: number;
  xpPercent: number;
  skills: string[];
};

const taskRequirements: Record<string, RequirementSeed[]> = {
  "AI 客服功能開發": [
    {
      role: "後端工程師",
      headcount: 1,
      budgetPercent: 60,
      xpPercent: 60,
      skills: ["後端", "程式開發"]
    },
    {
      role: "前端工程師",
      headcount: 1,
      budgetPercent: 40,
      xpPercent: 40,
      skills: ["前端", "程式開發"]
    }
  ],
  "行動版 UI 重構": [
    {
      role: "UI/UX 設計師",
      headcount: 1,
      budgetPercent: 50,
      xpPercent: 50,
      skills: ["UI 設計"]
    },
    {
      role: "前端工程師",
      headcount: 1,
      budgetPercent: 50,
      xpPercent: 50,
      skills: ["前端"]
    }
  ],
  "訂單系統優化": [
    {
      role: "後端工程師",
      headcount: 1,
      budgetPercent: 70,
      xpPercent: 70,
      skills: ["後端", "程式開發"]
    },
    {
      role: "QA 測試工程師",
      headcount: 1,
      budgetPercent: 30,
      xpPercent: 30,
      skills: ["程式開發"]
    }
  ],
  "API 文件撰寫": [
    {
      role: "後端工程師",
      headcount: 1,
      budgetPercent: 60,
      xpPercent: 60,
      skills: ["後端", "文書處理"]
    },
    {
      role: "產品經理",
      headcount: 1,
      budgetPercent: 40,
      xpPercent: 40,
      skills: ["文書處理"]
    }
  ],
  "員工管理頁面開發": [
    {
      role: "前端工程師",
      headcount: 1,
      budgetPercent: 60,
      xpPercent: 60,
      skills: ["前端"]
    },
    {
      role: "後端工程師",
      headcount: 1,
      budgetPercent: 40,
      xpPercent: 40,
      skills: ["後端"]
    }
  ],
  "活動報名系統測試": [
    {
      role: "QA 測試工程師",
      headcount: 1,
      budgetPercent: 70,
      xpPercent: 70,
      skills: ["程式開發"]
    },
    {
      role: "後端工程師",
      headcount: 1,
      budgetPercent: 30,
      xpPercent: 30,
      skills: ["後端"]
    }
  ],
  "社群貼文製作": [
    {
      role: "UI/UX 設計師",
      headcount: 1,
      budgetPercent: 50,
      xpPercent: 50,
      skills: ["UI 設計"]
    },
    {
      role: "產品經理",
      headcount: 1,
      budgetPercent: 50,
      xpPercent: 50,
      skills: ["文書處理"]
    }
  ],
  "客戶資料整理": [
    {
      role: "資料工程師",
      headcount: 1,
      budgetPercent: 100,
      xpPercent: 100,
      skills: ["資料整理"]
    }
  ],
  "產品介紹文撰寫": [
    {
      role: "產品經理",
      headcount: 1,
      budgetPercent: 100,
      xpPercent: 100,
      skills: ["文書處理"]
    }
  ],
  "Banner 設計": [
    {
      role: "UI/UX 設計師",
      headcount: 1,
      budgetPercent: 100,
      xpPercent: 100,
      skills: ["UI 設計"]
    }
  ]
};

async function main() {
  const tags = await prisma.profileTag.findMany();
  const tagByKey = new Map(tags.map((tag) => [`${tag.type}:${tag.name}`, tag]));
  let updatedTasks = 0;
  let updatedApplications = 0;

  for (const [title, requirements] of Object.entries(taskRequirements)) {
    const task = await prisma.task.findFirst({
      where: { title },
      include: {
        roleRequirements: true,
        applications: true
      }
    });
    if (!task || task.roleRequirements.length > 0) {
      continue;
    }

    const createdRequirements = [];
    for (const requirement of requirements) {
      const roleTag = tagByKey.get(`ROLE:${requirement.role}`);
      if (!roleTag) {
        throw new Error(`Missing role tag: ${requirement.role}`);
      }

      const created = await prisma.taskRoleRequirement.create({
        data: {
          taskId: task.id,
          roleTagId: roleTag.id,
          headcount: requirement.headcount,
          budgetPercent: requirement.budgetPercent,
          xpPercent: requirement.xpPercent,
          skillTags: {
            create: requirement.skills.map((skill) => {
              const skillTag = tagByKey.get(`SKILL:${skill}`);
              if (!skillTag) {
                throw new Error(`Missing skill tag: ${skill}`);
              }
              return { skillTagId: skillTag.id };
            })
          }
        }
      });
      createdRequirements.push(created);
    }

    const fallbackRequirement = createdRequirements[0];
    for (const application of task.applications) {
      if (!application.roleRequirementId) {
        await prisma.taskApplication.update({
          where: { id: application.id },
          data: { roleRequirementId: fallbackRequirement.id }
        });
        updatedApplications += 1;
      }
    }

    updatedTasks += 1;
  }

  console.log(
    `Backfill complete: ${updatedTasks} tasks, ${updatedApplications} applications`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
