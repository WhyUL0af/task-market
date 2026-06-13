import * as bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = Array.from({ length: 10 }, (_, index) => {
    const name = String(11346021 + index);
    return {
      name,
      email: `${name}@ntub.edu.tw`,
      password: `ntub${name}`
    };
  });

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: "EMPLOYEE",
        passwordHash: await bcrypt.hash(user.password, 10)
      },
      create: {
        email: user.email,
        name: user.name,
        role: "EMPLOYEE",
        passwordHash: await bcrypt.hash(user.password, 10)
      }
    });
  }

  console.log(`Employees ready: ${users.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
