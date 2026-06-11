"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db";
import { requireTechnician } from "@/server/access";
import { storage } from "@/server/services/storage";
import { enqueueJob } from "@/server/jobs/enqueue";
import {
  type ActionResult,
  fromZodError,
  failure,
  success,
} from "@/server/actions/action-result";
import type { MeasurementType } from "@/generated/prisma/enums";

const todayUtc = () => new Date(new Date().toISOString().slice(0, 10));

async function assertAssigned(technicianId: string, projectId: string) {
  const assignment = await prisma.assignment.findFirst({
    where: { technicianId, projectId, status: { not: "CANCELLED" } },
  });
  if (!assignment) throw new Error("FORBIDDEN");
}

function revalidate(projectId: string) {
  revalidatePath(`/tech/jobs/${projectId}`);
  revalidatePath(`/tech/jobs/${projectId}/log`);
  revalidatePath(`/manager/projects/${projectId}`);
}

/** Today's log, created as draft on first access. */
export async function ensureTodayLog(projectId: string) {
  const { technician } = await requireTechnician();
  await assertAssigned(technician.id, projectId);

  return prisma.dailyLog.upsert({
    where: {
      projectId_technicianId_logDate: {
        projectId,
        technicianId: technician.id,
        logDate: todayUtc(),
      },
    },
    create: { projectId, technicianId: technician.id, logDate: todayUtc() },
    update: {},
  });
}

const logDetailsSchema = z.object({
  notes: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .nullable(),
  workHours: z.coerce.number().min(0).max(24).nullable().catch(null),
});

export async function saveLogDetails(
  logId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { technician } = await requireTechnician();
  const log = await prisma.dailyLog.findUnique({ where: { id: logId } });
  if (!log || log.technicianId !== technician.id) return failure("notFound");
  if (log.status !== "DRAFT") return failure("alreadySubmitted");

  const parsed = logDetailsSchema.safeParse({
    notes: formData.get("notes"),
    workHours: formData.get("workHours") || null,
  });
  if (!parsed.success) return fromZodError(parsed.error);

  await prisma.dailyLog.update({ where: { id: logId }, data: parsed.data });
  revalidate(log.projectId);
  return success;
}

const measurementSchema = z.object({
  standardId: z
    .string()
    .transform((value) => (value === "" ? null : value))
    .nullable(),
  type: z.enum([
    "TOLERANCE",
    "CLEARANCE",
    "OIL_LEVEL",
    "OIL_CHANGE",
    "PRESSURE",
    "TEMPERATURE",
    "TORQUE",
    "OTHER",
  ]),
  name: z.string().trim().min(1),
  value: z.coerce.number(),
  unit: z.string().trim().min(1),
  finPosition: z
    .enum(["PORT", "STARBOARD"])
    .nullable()
    .or(z.literal("").transform(() => null)),
  notes: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional(),
});

export async function addMeasurement(
  logId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { technician } = await requireTechnician();
  const log = await prisma.dailyLog.findUnique({ where: { id: logId } });
  if (!log || log.technicianId !== technician.id) return failure("notFound");
  if (log.status !== "DRAFT") return failure("alreadySubmitted");

  const parsed = measurementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;

  // withinSpec computed against the chosen standard at save time.
  let withinSpec: boolean | null = null;
  let type: MeasurementType = data.type;
  let name = data.name;
  let unit = data.unit;

  if (data.standardId) {
    const standard = await prisma.measurementStandard.findUnique({
      where: { id: data.standardId },
    });
    if (!standard) return failure("notFound");
    type = standard.type;
    name = standard.name;
    unit = standard.unit;
    const aboveMin = standard.minValue === null || data.value >= standard.minValue;
    const belowMax = standard.maxValue === null || data.value <= standard.maxValue;
    withinSpec = aboveMin && belowMax;
  }

  await prisma.measurement.create({
    data: {
      dailyLogId: logId,
      standardId: data.standardId,
      type,
      name,
      value: data.value,
      unit,
      finPosition: data.finPosition,
      withinSpec,
      notes: data.notes ?? null,
    },
  });
  revalidate(log.projectId);
  return success;
}

export async function deleteMeasurement(measurementId: string): Promise<ActionResult> {
  const { technician } = await requireTechnician();
  const measurement = await prisma.measurement.findUnique({
    where: { id: measurementId },
    include: { dailyLog: true },
  });
  if (!measurement || measurement.dailyLog.technicianId !== technician.id) {
    return failure("notFound");
  }
  if (measurement.dailyLog.status !== "DRAFT") return failure("alreadySubmitted");

  await prisma.measurement.delete({ where: { id: measurementId } });
  revalidate(measurement.dailyLog.projectId);
  return success;
}

export async function deletePhoto(photoId: string): Promise<ActionResult> {
  const { technician } = await requireTechnician();
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: { dailyLog: true },
  });
  if (!photo || !photo.dailyLog || photo.dailyLog.technicianId !== technician.id) {
    return failure("notFound");
  }
  if (photo.dailyLog.status !== "DRAFT") return failure("alreadySubmitted");

  await prisma.photo.delete({ where: { id: photoId } });
  await storage.delete(photo.storageKey);
  revalidate(photo.projectId);
  return success;
}

export async function submitDailyLog(logId: string): Promise<ActionResult> {
  const { technician } = await requireTechnician();
  const log = await prisma.dailyLog.findUnique({ where: { id: logId } });
  if (!log || log.technicianId !== technician.id) return failure("notFound");
  if (log.status !== "DRAFT") return failure("alreadySubmitted");

  await prisma.$transaction(async (tx) => {
    await tx.dailyLog.update({
      where: { id: logId },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });
    await enqueueJob("DAILY_LOG_ANALYSIS", { dailyLogId: logId }, tx);
  });
  revalidate(log.projectId);
  return success;
}
