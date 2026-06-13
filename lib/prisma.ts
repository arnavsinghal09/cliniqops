import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });

declare global {
  var prisma: PrismaClient | undefined;
}
const prisma = global.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") global.prisma = prisma;
export default prisma;
