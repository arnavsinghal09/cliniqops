import { config } from "dotenv";
config({ path: ".env" });

import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

// Email handle -> display name. Drives both the seed and the dashboard greeting.
const DOCTORS: Record<string, string> = {
  "dr.sharma": "Dr. Anjali Sharma",
  "dr.patel": "Dr. Rohan Patel",
  "dr.mehta": "Dr. Kavya Mehta",
  "dr.singh": "Dr. Arjun Singh",
  "dr.kumar": "Dr. Neha Kumar",
};

async function main() {
  const hash = await bcrypt.hash("password123", 10);

  const sunrise = await prisma.clinic.upsert({
    where: { slug: "sunrise" },
    update: {},
    create: { name: "Sunrise Clinic", slug: "sunrise" },
  });
  const metro = await prisma.clinic.upsert({
    where: { slug: "metro" },
    update: {},
    create: { name: "Metro Health", slug: "metro" },
  });

  // Doctors. `update: { name }` backfills the name onto rows seeded before the
  // name column existed — re-running the seed repairs old data.
  for (const [handle, name] of Object.entries(DOCTORS)) {
    await prisma.user.upsert({
      where: {
        email_clinicId: {
          email: `${handle}@sunrise.com`,
          clinicId: sunrise.id,
        },
      },
      update: { name },
      create: {
        email: `${handle}@sunrise.com`,
        name,
        passwordHash: hash,
        role: "DOCTOR",
        clinicId: sunrise.id,
      },
    });
  }

  await prisma.user.upsert({
    where: {
      email_clinicId: { email: "admin@sunrise.com", clinicId: sunrise.id },
    },
    update: { name: "Sunrise Admin" },
    create: {
      email: "admin@sunrise.com",
      name: "Sunrise Admin",
      passwordHash: hash,
      role: "ADMIN",
      clinicId: sunrise.id,
    },
  });
  await prisma.user.upsert({
    where: { email_clinicId: { email: "admin@metro.com", clinicId: metro.id } },
    update: { name: "Metro Admin" },
    create: {
      email: "admin@metro.com",
      name: "Metro Admin",
      passwordHash: hash,
      role: "ADMIN",
      clinicId: metro.id,
    },
  });

  console.log("Seeded.");
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
