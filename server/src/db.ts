import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function getSettings() {
  return prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}
