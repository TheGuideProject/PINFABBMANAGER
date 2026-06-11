import { prisma } from "@/server/db";
import type { JobType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export type JobPayloads = {
  DAILY_LOG_ANALYSIS: { dailyLogId: string };
  TRANSCRIPTION: { recordingId: string };
  MEETING_ANALYSIS: { recordingId: string };
  REPORT_GENERATION: { reportId: string; sectionKey?: string };
  PHOTO_ANALYSIS: { photoId: string };
};

export async function enqueueJob<T extends JobType>(
  type: T,
  payload: JobPayloads[T],
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.aiJob.create({ data: { type, payload } });
}
