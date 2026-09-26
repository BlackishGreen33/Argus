import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { argusPrisma?: PrismaClient };

export const prismaPool = new Pool({ connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });
const adapter = new PrismaPg(prismaPool);
export const prisma = globalForPrisma.argusPrisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.argusPrisma = prisma;
