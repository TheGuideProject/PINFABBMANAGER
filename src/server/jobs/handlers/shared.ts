import { prisma } from "@/server/db";
import { notifyManagers } from "@/server/services/notifications";
import type { ExtractedCriticality } from "@/server/services/ai/schemas";
import type { CriticalitySource } from "@/generated/prisma/enums";

export async function readToBuffer(stream: ReadableStream): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

const MIN_CONFIDENCE = 0.5;
const MAX_PER_ANALYSIS = 8;

/** Persist extracted criticalities and alert the office. Returns created count. */
export async function persistCriticalities({
  extracted,
  projectId,
  source,
  technicianId,
  dailyLogId,
  transcriptId,
  projectCode,
}: {
  extracted: ExtractedCriticality[];
  projectId: string;
  source: CriticalitySource;
  technicianId?: string | null;
  dailyLogId?: string | null;
  transcriptId?: string | null;
  projectCode: string;
}) {
  const relevant = extracted
    .filter((item) => item.confidence >= MIN_CONFIDENCE)
    .slice(0, MAX_PER_ANALYSIS);

  for (const item of relevant) {
    await prisma.criticality.create({
      data: {
        projectId,
        severity: item.severity,
        category: item.category,
        source,
        title: item.title.slice(0, 200),
        description: item.description,
        recommendedAction: item.recommendedAction,
        finPosition: item.finPosition,
        technicianId: technicianId ?? null,
        dailyLogId: dailyLogId ?? null,
        transcriptId: transcriptId ?? null,
        aiConfidence: item.confidence,
        aiRaw: item,
      },
    });
  }

  if (relevant.length > 0) {
    const worst =
      relevant.find((item) => item.severity === "CRITICAL") ??
      relevant.find((item) => item.severity === "HIGH") ??
      relevant[0];
    await notifyManagers({
      type: "CRITICALITY",
      title: `${projectCode}: ${relevant.length} new ${relevant.length === 1 ? "criticality" : "criticalities"}`,
      body: `${worst.severity}: ${worst.title}`,
      link: "/manager/criticalities",
    });
  }

  return relevant.length;
}
