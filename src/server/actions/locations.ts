"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth";
import { locationSchema } from "@/lib/validators";
import {
  type ActionResult,
  fromZodError,
  failure,
  success,
} from "@/server/actions/action-result";

function revalidate() {
  revalidatePath("/manager/locations");
  revalidatePath("/manager/map");
}

export async function createLocation(formData: FormData): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const parsed = locationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  await prisma.location.create({ data: parsed.data });
  revalidate();
  return success;
}

export async function updateLocation(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const parsed = locationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  await prisma.location.update({ where: { id }, data: parsed.data });
  revalidate();
  return success;
}

export async function deleteLocation(id: string): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const projectCount = await prisma.project.count({ where: { locationId: id } });
  if (projectCount > 0) return failure("hasProjects");

  await prisma.location.delete({ where: { id } });
  revalidate();
  return success;
}
