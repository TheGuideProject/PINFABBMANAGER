import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import { notifyManagers } from "@/server/services/notifications";
import type { AiJob } from "@/generated/prisma/client";
import { runDailyLogAnalysis } from "./handlers/daily-log-analysis";
import { runTranscription } from "./handlers/transcription";
import { runMeetingAnalysis } from "./handlers/meeting-analysis";
import { runReportGeneration } from "./handlers/report-generation";

const POLL_INTERVAL_MS = 5000;
const WORKER_ID = `worker-${randomUUID().slice(0, 8)}`;

const handlers: Record<string, (job: AiJob) => Promise<unknown>> = {
  DAILY_LOG_ANALYSIS: runDailyLogAnalysis,
  TRANSCRIPTION: runTranscription,
  MEETING_ANALYSIS: runMeetingAnalysis,
  REPORT_GENERATION: runReportGeneration,
};

/** Claim one pending job atomically (safe across replicas via SKIP LOCKED). */
async function claimJob(): Promise<AiJob | null> {
  const rows = await prisma.$queryRaw<AiJob[]>`
    UPDATE "AiJob" SET status = 'RUNNING', "lockedBy" = ${WORKER_ID}, "startedAt" = now()
    WHERE id = (
      SELECT id FROM "AiJob"
      WHERE status = 'PENDING' AND "runAt" <= now()
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
  `;
  return rows[0] ?? null;
}

async function processJob(job: AiJob) {
  const handler = handlers[job.type];
  try {
    if (!handler) throw new Error(`No handler for job type ${job.type}`);
    const result = await handler(job);
    await prisma.aiJob.update({
      where: { id: job.id },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        result: (result ?? {}) as object,
        error: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const attempts = job.attempts + 1;
    const exhausted = attempts >= job.maxAttempts;
    console.error(`[jobs] ${job.type} ${job.id} failed (attempt ${attempts}):`, message);

    await prisma.aiJob.update({
      where: { id: job.id },
      data: exhausted
        ? { status: "FAILED", attempts, error: message, finishedAt: new Date() }
        : {
            status: "PENDING",
            attempts,
            error: message,
            // Exponential backoff: 2, 4, 8… minutes.
            runAt: new Date(Date.now() + 2 ** attempts * 60_000),
            lockedBy: null,
            startedAt: null,
          },
    });

    if (exhausted) {
      await notifyManagers({
        type: "SYSTEM",
        title: `Background job failed: ${job.type}`,
        body: message.slice(0, 300),
        link: "/manager/settings/jobs",
      }).catch(() => {});
    }
  }
}

async function loop() {
  for (;;) {
    try {
      const job = await claimJob();
      if (job) {
        await processJob(job);
        continue; // drain the queue without sleeping between jobs
      }
    } catch (error) {
      console.error("[jobs] worker loop error:", error);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

const globalForWorker = globalThis as unknown as { __pinfabbWorkerStarted?: boolean };

export function startWorker() {
  if (globalForWorker.__pinfabbWorkerStarted) return;
  globalForWorker.__pinfabbWorkerStarted = true;

  // Re-queue jobs orphaned by a previous deploy (RUNNING but never finished).
  void prisma.aiJob
    .updateMany({
      where: { status: "RUNNING" },
      data: { status: "PENDING", lockedBy: null, startedAt: null },
    })
    .then(({ count }) => {
      if (count > 0) console.log(`[jobs] re-queued ${count} orphaned job(s)`);
    })
    .catch(() => {});

  console.log(`[jobs] worker ${WORKER_ID} started (poll ${POLL_INTERVAL_MS}ms)`);
  void loop();
}
