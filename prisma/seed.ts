import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@example.com";
  const passwordHash = await bcrypt.hash("password123", 12);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      habits: {
        create: [
          { name: "Exercise", targetDaysPerMonth: 24 },
          { name: "Read", targetDaysPerMonth: 26 },
          { name: "Meditate", targetDaysPerMonth: 20 },
          { name: "Drink Water", targetDaysPerMonth: 31 },
          { name: "Sleep Before Midnight", targetDaysPerMonth: 18 },
        ],
      },
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
