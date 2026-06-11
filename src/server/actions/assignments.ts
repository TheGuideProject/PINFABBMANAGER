"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth";
import { assignmentSchema } from "@/lib/validators";
import {
  type ActionResult,
  fromZodError,
  failure,
  success,
} from "@/server/actions/action-result";

function revalidate(projectId: string) {
  revalidatePath(`/manager/projects/${projectId}`);
  revalidatePath("/manager/planning");
  revalidatePath("/manager");
}

/** Date-overlap check against the technician's other assignments. */
async function findOverlap(
  technicianId: string,
  startDate: Date,
  endDate: Date,
  excludeId?: string,
) {
  return prisma.assignment.findFirst({
    where: {
      technicianId,
      status: { notIn: ["CANCELLED", "COMPLETED"] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    include: { project: { select: { code: true } } },
  });
}

export type AssignmentResult = ActionResult | { ok: true; warning: string };

export async function createAssignment(
  formData: FormData,
): Promise<AssignmentResult> {
  await requireRole("MANAGER", "ADMIN");
  const parsed = assignmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;

  const existing = await prisma.assignment.findUnique({
    where: {
      projectId_technicianId: {
        projectId: data.projectId,
        technicianId: data.technicianId,
      },
    },
  });
  if (existing) return failure("alreadyAssigned");

  const overlap = await findOverlap(data.technicianId, data.startDate, data.endDate);

  await prisma.assignment.create({ data });
  revalidate(data.projectId);

  if (overlap) return { ok: true, warning: overlap.project.code };
  return success;
}

export async function updateAssignment(
  id: string,
  formData: FormData,
): Promise<AssignmentResult> {
  await requireRole("MANAGER", "ADMIN");
  const parsed = assignmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;

  const overlap = await findOverlap(
    data.technicianId,
    data.startDate,
    data.endDate,
    id,
  );

  await prisma.assignment.update({ where: { id }, data });
  revalidate(data.projectId);

  if (overlap) return { ok: true, warning: overlap.project.code };
  return success;
}

export async function deleteAssignment(id: string): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const assignment = await prisma.assignment.delete({ where: { id } });
  revalidate(assignment.projectId);
  return success;
}
