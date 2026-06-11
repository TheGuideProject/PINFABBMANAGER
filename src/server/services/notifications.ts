import { prisma } from "@/server/db";
import type { NotificationType } from "@/generated/prisma/enums";

export async function notifyUser(
  userId: string,
  notification: {
    type: NotificationType;
    title: string;
    body?: string;
    link?: string;
  },
) {
  await prisma.notification.create({ data: { userId, ...notification } });
}

/** All active managers/admins (criticality alerts, job failures). */
export async function notifyManagers(notification: {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  const managers = await prisma.user.findMany({
    where: { role: { in: ["MANAGER", "ADMIN"] }, active: true },
    select: { id: true },
  });
  if (managers.length === 0) return;
  await prisma.notification.createMany({
    data: managers.map((manager) => ({ userId: manager.id, ...notification })),
  });
}
