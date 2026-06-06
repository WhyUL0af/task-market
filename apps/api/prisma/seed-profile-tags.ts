import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const tags = [
  { name: "程式開發", type: "SKILL" as const },
  { name: "前端", type: "SKILL" as const },
  { name: "後端", type: "SKILL" as const },
  { name: "UI 設計", type: "SKILL" as const },
  { name: "文書處理", type: "SKILL" as const },
  { name: "資料整理", type: "SKILL" as const },
  { name: "活動支援", type: "SKILL" as const },
  { name: "前端工程師", type: "ROLE" as const },
  { name: "後端工程師", type: "ROLE" as const },
  { name: "全端工程師", type: "ROLE" as const },
  { name: "UI/UX 設計師", type: "ROLE" as const },
  { name: "QA 測試工程師", type: "ROLE" as const },
  { name: "DevOps 工程師", type: "ROLE" as const },
  { name: "資料工程師", type: "ROLE" as const },
  { name: "產品經理", type: "ROLE" as const }
];

async function main() {
  for (const tag of tags) {
    await prisma.profileTag.upsert({
      where: {
        type_name: {
          type: tag.type,
          name: tag.name
        }
      },
      update: {},
      create: tag
    });
  }

  console.log(`Profile tags ready: ${tags.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
