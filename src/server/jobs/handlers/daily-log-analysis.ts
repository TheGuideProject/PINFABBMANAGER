import { prisma } from "@/server/db";
import { storage } from "@/server/services/storage";
import {
  aiEnabled,
  extractStructured,
  imageBlock,
} from "@/server/services/ai/claude";
import {
  criticalityExtractionSchema,
  type CriticalityExtraction,
} from "@/server/services/ai/schemas";
import { ANALYST_SYSTEM, buildProjectContext } from "@/server/services/ai/prompts";
import { persistCriticalities, readToBuffer } from "./shared";
import type { AiJob } from "@/generated/prisma/client";
import type Anthropic from "@anthropic-ai/sdk";

const MAX_PHOTOS = 6;

export async function runDailyLogAnalysis(job: AiJob) {
  const { dailyLogId } = job.payload as { dailyLogId: string };

  const log = await prisma.dailyLog.findUniqueOrThrow({
    where: { id: dailyLogId },
    include: {
      project: { select: { id: true, code: true } },
      technician: { include: { user: { select: { name: true } } } },
      measurements: { include: { standard: true } },
      photos: true,
    },
  });

  if (!aiEnabled()) {
    // No API key configured: mark analyzed so the flow doesn't wedge.
    await prisma.dailyLog.update({
      where: { id: log.id },
      data: { status: "ANALYZED" },
    });
    return { skipped: "ANTHROPIC_API_KEY missing" };
  }

  const context = await buildProjectContext(log.project.id);

  const measurementLines =
    log.measurements.length > 0
      ? log.measurements.map((measurement) => {
          const range = measurement.standard
            ? ` (allowed ${measurement.standard.minValue ?? "-∞"}–${measurement.standard.maxValue ?? "+∞"} ${measurement.standard.unit})`
            : "";
          const spec =
            measurement.withinSpec === null
              ? ""
              : measurement.withinSpec
                ? " [in spec]"
                : " [OUT OF SPEC]";
          return `- ${measurement.name}${measurement.finPosition ? ` (${measurement.finPosition})` : ""}: ${measurement.value} ${measurement.unit}${range}${spec}${measurement.notes ? ` — ${measurement.notes}` : ""}`;
        })
      : ["- (none recorded)"];

  const userContent: Anthropic.ContentBlockParam[] = [
    {
      type: "text",
      text: [
        context,
        "",
        `=== DAILY LOG ${log.logDate.toISOString().slice(0, 10)} by ${log.technician.user.name} ===`,
        `Work hours: ${log.workHours ?? "n/a"}`,
        "",
        "Notes:",
        log.notes?.trim() || "(no notes)",
        "",
        "Measurements:",
        ...measurementLines,
        "",
        log.photos.length > 0
          ? `Attached photos follow (categories: ${log.photos
              .slice(0, MAX_PHOTOS)
              .map((photo) => photo.category + (photo.caption ? ` "${photo.caption}"` : ""))
              .join(", ")}). Inspect them for visible damage, leaks, corrosion or anomalies.`
          : "(no photos)",
        "",
        "Analyze this daily log against the project plan and standards. Extract criticalities.",
      ].join("\n"),
    },
  ];

  for (const photo of log.photos.slice(0, MAX_PHOTOS)) {
    try {
      const buffer = await readToBuffer(await storage.getStream(photo.storageKey));
      userContent.push(imageBlock(buffer, photo.mimeType));
    } catch {
      // A missing blob must not block the textual analysis.
    }
  }

  const { data, usage } = await extractStructured<CriticalityExtraction>({
    system: ANALYST_SYSTEM,
    userContent,
    schema: criticalityExtractionSchema as unknown as Record<string, unknown>,
  });

  const created = await persistCriticalities({
    extracted: data.criticalities,
    projectId: log.project.id,
    projectCode: log.project.code,
    source: "DAILY_LOG",
    technicianId: log.technicianId,
    dailyLogId: log.id,
  });

  await prisma.dailyLog.update({
    where: { id: log.id },
    data: { status: "ANALYZED" },
  });

  return { created, summary: data.summary, usage };
}
