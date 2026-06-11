"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth";
import { technicianSchema } from "@/lib/validators";
import {
  type ActionResult,
  fromZodError,
  failure,
  success,
} from "@/server/actions/action-result";

export async function createTechnician(formData: FormData): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const parsed = technicianSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { name, email, password, phone, homeBase, locale } = parsed.data;

  if (!password) return failure("passwordRequired");

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) return failure("emailTaken");

  await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      passwordHash: bcrypt.hashSync(password, 10),
      role: "TECHNICIAN",
      locale,
      technician: { create: { phone, homeBase } },
    },
  });
  revalidatePath("/manager/technicians");
  return success;
}

export async function updateTechnician(
  technicianId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const parsed = technicianSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const { name, email, password, phone, homeBase, locale, active } = parsed.data;

  const technician = await prisma.technician.findUnique({
    where: { id: technicianId },
  });
  if (!technician) return failure("notFound");

  const emailOwner = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (emailOwner && emailOwner.id !== technician.userId) {
    return failure("emailTaken");
  }

  await prisma.user.update({
    where: { id: technician.userId },
    data: {
      name,
      email: email.toLowerCase(),
      locale,
      active: active ?? true,
      ...(password ? { passwordHash: bcrypt.hashSync(password, 10) } : {}),
      technician: { update: { phone, homeBase } },
    },
  });
  revalidatePath("/manager/technicians");
  return success;
}

export async function deactivateTechnician(
  technicianId: string,
): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const technician = await prisma.technician.findUnique({
    where: { id: technicianId },
    include: { user: true },
  });
  if (!technician) return failure("notFound");

  await prisma.user.update({
    where: { id: technician.userId },
    data: { active: !technician.user.active },
  });
  revalidatePath("/manager/technicians");
  return success;
}
