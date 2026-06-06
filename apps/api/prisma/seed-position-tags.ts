import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const positions = [
  "前端工程師",
  "後端工程師",
  "全端工程師",
  "UI/UX 設計師",
  "QA 測試工程師",
  "DevOps 工程師",
  "資料工程師",
  "產品經理"
];

const legacyPositions = ["企劃", "執行", "測試", "審稿", "協調"];

async function main() {
  for (const name of positions) {
    await prisma.profileTag.upsert({
      where: {
        type_name: {
          type: "ROLE",
          name
        }
      },
      update: {},
      create: {
        type: "ROLE",
        name
      }
    });
  }

  for (const name of legacyPositions) {
    const tag = await prisma.profileTag.findUnique({
      where: {
        type_name: {
          type: "ROLE",
          name
        }
      },
      include: {
        _count: {
          select: {
            users: true,
            taskRoleRequirements: true
          }
        }
      }
    });

    if (
      tag &&
      tag._count.users === 0 &&
      tag._count.taskRoleRequirements === 0
    ) {
      await prisma.profileTag.delete({ where: { id: tag.id } });
    }
  }

  console.log(`Position tags ready: ${positions.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
