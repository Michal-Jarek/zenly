import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Trivial, idempotent seed (one record) — proves `prisma db seed` runs in the container.
const prisma = new PrismaClient();

async function main() {
  const hasloHash = await bcrypt.hash("Admin123!Admin", 10);
  const user = await prisma.user.upsert({
    where: { login: "admin" },
    update: {},
    create: { login: "admin", email: "admin@zenly.local", hasloHash },
  });
  console.log(`[seed] user ready: ${user.login} <${user.email}>`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
