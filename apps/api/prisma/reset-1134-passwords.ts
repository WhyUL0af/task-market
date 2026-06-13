import * as bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { startsWith: "1134" } },
        { name: { startsWith: "1134" } }
      ]
    },
    select: {
      id: true,
      email: true,
      name: true
    }
  });

  for (const user of users) {
    const account = user.email.split("@")[0] || user.name;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(`ntub${account}`, 10)
      }
    });
  }

  console.log(`Updated 1134 accounts: ${users.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
