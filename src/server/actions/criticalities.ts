"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth";
import { notifyUser } from "@/server/services/notifications";
import {
  type ActionResult,
  fromZodError,
  failure,
  success,
} from "@/server/actions/action-result";
import type { CriticalityStatus } from "@/generated/prisma/enums";

const STATUSES: CriticalityStatus[] = [
  "OPEN",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "RESOLVED",
  "DISMISSED",
];

export async function setCriticalityStatus(
  id: string,
  status: CriticalityStatus,
): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  if (!STATUSES.includes(status)) return failure("validation");

  await prisma.criticality.update({
    where: { id },
    data: {
      status,
      resolvedAt: status === "RESOLVED" || status === "DISMISSED" ? new Date() : null,
    },
  });
  revalidatePath("/manager/criticalities");
  revalidatePath("/manager");
  return success;
}

const directiveSchema = z.object({
  projectId: z.string().min(1),
  toTechnicianId: z.string().min(1),
  criticalityId: z
    .string()
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional(),
  message: z.string().trim().min(1).max(2000),
});

export async function sendDirective(formData: FormData): Promise<ActionResult> {
  const session = await requireRole("MANAGER", "ADMIN");
  const parsed = directiveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;

  const technician = await prisma.technician.findUnique({
    where: { id: data.toTechnicianId },
    include: { user: { select: { id: true } } },
  });
  if (!technician) return failure("notFound");

  const directive = await prisma.directive.create({
    data: {
      projectId: data.projectId,
      criticalityId: data.criticalityId ?? null,
      fromUserId: session.user.id,
      toTechnicianId: data.toTechnicianId,
      message: data.message,
    },
    include: { project: { select: { code: true } } },
  });

  await notifyUser(technician.user.id, {
    type: "DIRECTIVE",
    title: `New directive — ${directive.project.code}`,
    body: data.message.slice(0, 140),
    link: "/tech/directives",
  });

  revalidatePath("/manager/criticalities");
  revalidatePath("/tech/directives");
  return success;
}

export async function acknowledgeDirective(id: string): Promise<ActionResult> {
  const session = await requireRole("TECHNICIAN");
  const directive = await prisma.directive.findUnique({
    where: { id },
    include: {
      toTechnician: { select: { userId: true } },
      project: { select: { code: true } },
    },
  });
  if (!directive || directive.toTechnician.userId !== session.user.id) {
    return failure("notFound");
  }
  if (directive.status === "ACKNOWLEDGED" || directive.status === "DONE") {
    return success;
  }

  await prisma.directive.update({
    where: { id },
    data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
  });

  await notifyUser(directive.fromUserId, {
    type: "DIRECTIVE",
    title: `Directive acknowledged — ${directive.project.code}`,
    body: directive.message.slice(0, 140),
    link: "/manager/criticalities",
  });

  revalidatePath("/tech/directives");
  return success;
}

/** Auto-mark SENT directives as READ when the technician opens the list. */
export async function markDirectivesRead() {
  const session = await requireRole("TECHNICIAN");
  await prisma.directive.updateMany({
    where: {
      toTechnician: { userId: session.user.id },
      status: "SENT",
    },
    data: { status: "READ" },
  });
}
