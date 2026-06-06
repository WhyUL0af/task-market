import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    throw new Error("Create an admin account before seeding allocation demo data.");
  }

  const [frontendRole, backendRole, frontendSkill, backendSkill] = await Promise.all([
    prisma.profileTag.findUnique({
      where: { type_name: { type: "ROLE", name: "前端工程師" } }
    }),
    prisma.profileTag.findUnique({
      where: { type_name: { type: "ROLE", name: "後端工程師" } }
    }),
    prisma.profileTag.findUnique({
      where: { type_name: { type: "SKILL", name: "前端" } }
    }),
    prisma.profileTag.findUnique({
      where: { type_name: { type: "SKILL", name: "後端" } }
    })
  ]);

  if (!frontendRole || !backendRole || !frontendSkill || !backendSkill) {
    throw new Error("Run seed-profile-tags.ts and seed-position-tags.ts first.");
  }

  const existing = await prisma.task.findFirst({
    where: { title: "分配需求範例任務" }
  });
  if (existing) {
    console.log(`Allocation demo task already exists: ${existing.id}`);
    return;
  }

  const task = await prisma.task.create({
    data: {
      title: "分配需求範例任務",
      description: "用來測試多職位報名、比例驗證與自動分配結果。",
      reward: 10000,
      xpReward: 1000,
      difficulty: "MEDIUM",
      status: "OPEN",
      creatorId: admin.id,
      roleRequirements: {
        create: [
          {
            roleTagId: frontendRole.id,
            headcount: 2,
            budgetPercent: 60,
            xpPercent: 60,
            skillTags: {
              create: [{ skillTagId: frontendSkill.id }]
            }
          },
          {
            roleTagId: backendRole.id,
            headcount: 1,
            budgetPercent: 40,
            xpPercent: 40,
            skillTags: {
              create: [{ skillTagId: backendSkill.id }]
            }
          }
        ]
      }
    },
    include: { roleRequirements: true }
  });

  const employees = await prisma.user.findMany({
    where: {
      role: "EMPLOYEE",
      email: {
        in: [
          "11346021@ntub.edu.tw",
          "11346022@ntub.edu.tw",
          "11346023@ntub.edu.tw",
          "11346024@ntub.edu.tw"
        ]
      }
    },
    orderBy: { email: "asc" }
  });

  const frontendRequirement = task.roleRequirements.find(
    (item) => item.roleTagId === frontendRole.id
  );
  const backendRequirement = task.roleRequirements.find(
    (item) => item.roleTagId === backendRole.id
  );
  if (!frontendRequirement || !backendRequirement) {
    throw new Error("Failed to create role requirements.");
  }

  for (const employee of employees) {
    const skillTagId =
      employee.email.endsWith("21@ntub.edu.tw") ||
      employee.email.endsWith("22@ntub.edu.tw")
        ? frontendSkill.id
        : backendSkill.id;
    await prisma.userProfileTag.upsert({
      where: {
        userId_tagId: {
          userId: employee.id,
          tagId: skillTagId
        }
      },
      update: {},
      create: {
        userId: employee.id,
        tagId: skillTagId
      }
    });
  }

  for (const employee of employees) {
    const roleRequirementId =
      employee.email.endsWith("24@ntub.edu.tw")
        ? backendRequirement.id
        : frontendRequirement.id;
    await prisma.taskApplication.upsert({
      where: {
        taskId_applicantId_roleRequirementId: {
          taskId: task.id,
          applicantId: employee.id,
          roleRequirementId
        }
      },
      update: {},
      create: {
        taskId: task.id,
        applicantId: employee.id,
        roleRequirementId,
        message: "測試分配需求功能"
      }
    });
  }

  console.log(`Allocation demo task ready: ${task.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
