"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth";
import { parseStructure, type TemplateSection } from "@/lib/report-template";
import {
  type ActionResult,
  fromZodError,
  failure,
  success,
} from "@/server/actions/action-result";

const sectionSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9_]+$/),
  titleEn: z.string().trim().min(1),
  titleIt: z.string().trim().min(1),
  kind: z.enum(["text", "table", "measurements", "photos", "signatures"]),
  aiHint: z.string().trim().default(""),
});

async function activeTemplate() {
  return prisma.reportTemplate.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });
}

async function saveStructure(templateId: string, sections: TemplateSection[]) {
  await prisma.reportTemplate.update({
    where: { id: templateId },
    data: { structure: sections },
  });
  revalidatePath("/manager/settings/templates");
}

export async function addTemplateSection(formData: FormData): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const parsed = sectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const template = await activeTemplate();
  if (!template) return failure("notFound");

  const sections = parseStructure(template.structure);
  if (sections.some((section) => section.key === parsed.data.key)) {
    return failure("validation");
  }
  // Keep signatures last when present.
  const signatureIndex = sections.findIndex((section) => section.kind === "signatures");
  if (signatureIndex >= 0) sections.splice(signatureIndex, 0, parsed.data);
  else sections.push(parsed.data);

  await saveStructure(template.id, sections);
  return success;
}

export async function updateTemplateSection(
  key: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const parsed = sectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const template = await activeTemplate();
  if (!template) return failure("notFound");

  const sections = parseStructure(template.structure);
  const index = sections.findIndex((section) => section.key === key);
  if (index < 0) return failure("notFound");
  if (
    parsed.data.key !== key &&
    sections.some((section) => section.key === parsed.data.key)
  ) {
    return failure("validation");
  }

  sections[index] = parsed.data;
  await saveStructure(template.id, sections);
  return success;
}

export async function deleteTemplateSection(key: string): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const template = await activeTemplate();
  if (!template) return failure("notFound");

  const sections = parseStructure(template.structure).filter(
    (section) => section.key !== key,
  );
  await saveStructure(template.id, sections);
  return success;
}

export async function moveTemplateSection(
  key: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  await requireRole("MANAGER", "ADMIN");
  const template = await activeTemplate();
  if (!template) return failure("notFound");

  const sections = parseStructure(template.structure);
  const index = sections.findIndex((section) => section.key === key);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= sections.length) return success;

  [sections[index], sections[target]] = [sections[target], sections[index]];
  await saveStructure(template.id, sections);
  return success;
}
