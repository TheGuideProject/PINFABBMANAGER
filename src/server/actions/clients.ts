"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth";
import { clientSchema } from "@/lib/validators";
import {
  type ActionResult,
  fromZodError,
  failure,
  success,
} from "@/server/actions/action-result";

export async function createClient(formData: FormData): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  await prisma.client.create({ data: parsed.data });
  revalidatePath("/manager/clients");
  return success;
}

export async function updateClient(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  await prisma.client.update({ where: { id }, data: parsed.data });
  revalidatePath("/manager/clients");
  return success;
}

export async function deleteClient(id: string): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const projectCount = await prisma.project.count({ where: { clientId: id } });
  if (projectCount > 0) return failure("hasProjects");

  await prisma.vessel.updateMany({
    where: { clientId: id },
    data: { clientId: null },
  });
  await prisma.client.delete({ where: { id } });
  revalidatePath("/manager/clients");
  return success;
}
