import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const skills = [
  "前端",
  "後端",
  "全端",
  "UI 設計",
  "QA 測試",
  "資料庫",
  "DevOps",
  "文件整理"
];

async function main() {
  for (const name of skills) {
    await prisma.profileTag.upsert({
      where: {
        type_name: {
          type: "SKILL",
          name
        }
      },
      update: {},
      create: {
        type: "SKILL",
        name
      }
    });
  }

  console.log(`Skill tags ready: ${skills.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
