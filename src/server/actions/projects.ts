"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth";
import { milestoneSchema, projectSchema } from "@/lib/validators";
import {
  type ActionResult,
  fromZodError,
  failure,
  success,
} from "@/server/actions/action-result";

function revalidate(projectId?: string) {
  revalidatePath("/manager/projects");
  revalidatePath("/manager");
  revalidatePath("/manager/map");
  revalidatePath("/manager/planning");
  if (projectId) revalidatePath(`/manager/projects/${projectId}`);
}

export async function createProject(formData: FormData): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const existing = await prisma.project.findUnique({
    where: { code: parsed.data.code },
  });
  if (existing) return failure("codeTaken");

  await prisma.project.create({ data: parsed.data });
  revalidate();
  return success;
}

export async function updateProject(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const existing = await prisma.project.findUnique({
    where: { code: parsed.data.code },
  });
  if (existing && existing.id !== id) return failure("codeTaken");

  await prisma.project.update({ where: { id }, data: parsed.data });
  revalidate(id);
  return success;
}

export async function deleteProject(id: string): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  await prisma.project.delete({ where: { id } });
  revalidate();
  return success;
}

export async function addMilestone(formData: FormData): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const parsed = milestoneSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  await prisma.milestone.create({ data: parsed.data });
  revalidate(parsed.data.projectId);
  return success;
}

export async function toggleMilestone(id: string): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const milestone = await prisma.milestone.findUnique({ where: { id } });
  if (!milestone) return failure("notFound");

  await prisma.milestone.update({
    where: { id },
    data: { done: !milestone.done },
  });
  revalidate(milestone.projectId);
  return success;
}

export async function deleteMilestone(id: string): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const milestone = await prisma.milestone.delete({ where: { id } });
  revalidate(milestone.projectId);
  return success;
}
