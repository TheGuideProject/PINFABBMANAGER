"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth";
import { vesselSchema } from "@/lib/validators";
import {
  type ActionResult,
  fromZodError,
  failure,
  success,
} from "@/server/actions/action-result";

export async function createVessel(formData: FormData): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const parsed = vesselSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  await prisma.vessel.create({ data: parsed.data });
  revalidatePath("/manager/vessels");
  return success;
}

export async function updateVessel(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const parsed = vesselSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  await prisma.vessel.update({ where: { id }, data: parsed.data });
  revalidatePath("/manager/vessels");
  return success;
}

export async function deleteVessel(id: string): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const projectCount = await prisma.project.count({ where: { vesselId: id } });
  if (projectCount > 0) return failure("hasProjects");

  await prisma.vessel.delete({ where: { id } });
  revalidatePath("/manager/vessels");
  return success;
}
