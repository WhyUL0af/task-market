import * as bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@yuloaf.work";
  const password = process.env.ADMIN_PASSWORD ?? "password123";
  const name = process.env.ADMIN_NAME ?? "Admin";

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role: "ADMIN",
      passwordHash: await bcrypt.hash(password, 10)
    },
    create: {
      email,
      name,
      role: "ADMIN",
      passwordHash: await bcrypt.hash(password, 10)
    },
    select: {
      email: true,
      name: true,
      role: true
    }
  });

  console.log(`Admin ready: ${user.email} (${user.role})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
