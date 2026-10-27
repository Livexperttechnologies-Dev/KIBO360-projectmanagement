import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const fullName = process.env.INITIAL_ADMIN_NAME?.trim();

  if (!email || !password || !fullName) {
    throw new Error("SUPER_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD, and INITIAL_ADMIN_NAME are required.");
  }
  if (password.length < 12) {
    throw new Error("INITIAL_ADMIN_PASSWORD must be at least 12 characters long.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Super-admin account ${email} already exists; left its password and account unchanged.`);
    return;
  }

  const [firstName, ...rest] = fullName.split(/\s+/);
  const lastName = rest.join(" ") || firstName;
  const department = await prisma.department.upsert({
    where: { code: "SOFTWARE_IT" },
    update: {},
    create: {
      id: "dept-sw",
      name: "Software / IT",
      code: "SOFTWARE_IT",
      description: "Core software engineering and IT operations",
    },
  });

  await prisma.user.create({
    data: {
      id: randomUUID(),
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMINISTRATOR",
      isActive: true,
      isInvited: false,
      departmentId: department.id,
      profile: {
        create: {
          firstName,
          lastName,
          jobTitle: "Super Administrator",
        },
      },
    },
  });

  console.log(`Created the initial super-admin account ${email}. Change its password after first sign-in.`);
}

main()
  .catch((error) => {
    console.error("Could not provision the initial super-admin account:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
