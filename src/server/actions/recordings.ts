"use server";

import { revalidatePath } from "next/cache";
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@/server/db";
import { requireTechnician } from "@/server/access";
import { storage } from "@/server/services/storage";
import { enqueueJob } from "@/server/jobs/enqueue";
import {
  type ActionResult,
  failure,
  success,
} from "@/server/actions/action-result";

const ALLOWED_AUDIO = ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg"];

async function assertAssigned(technicianId: string, projectId: string) {
  const assignment = await prisma.assignment.findFirst({
    where: { technicianId, projectId, status: { not: "CANCELLED" } },
  });
  if (!assignment) throw new Error("FORBIDDEN");
}

/** Step 1: presigned (or proxied) PUT target for the audio blob. */
export async function getRecordingUploadUrl(projectId: string, mimeType: string) {
  const { technician } = await requireTechnician();
  await assertAssigned(technician.id, projectId);
  if (!ALLOWED_AUDIO.some((allowed) => mimeType.startsWith(allowed))) {
    throw new Error("INVALID_MIME");
  }

  const extension = mimeType.startsWith("audio/webm")
    ? "webm"
    : mimeType.startsWith("audio/mp4")
      ? "m4a"
      : mimeType.startsWith("audio/ogg")
        ? "ogg"
        : "mp3";
  const key = `projects/${projectId}/audio/${createId()}.${extension}`;
  const target = await storage.getUploadUrl(key, mimeType);
  return { key, ...target };
}

/** Step 2: after the blob is uploaded, register it and queue transcription. */
export async function finalizeRecording(input: {
  projectId: string;
  storageKey: string;
  mimeType: string;
  durationSec: number | null;
}): Promise<ActionResult> {
  const { technician } = await requireTechnician();
  await assertAssigned(technician.id, input.projectId);

  if (!input.storageKey.startsWith(`projects/${input.projectId}/audio/`)) {
    return failure("validation");
  }

  await prisma.$transaction(async (tx) => {
    const recording = await tx.meetingRecording.create({
      data: {
        projectId: input.projectId,
        technicianId: technician.id,
        storageKey: input.storageKey,
        mimeType: input.mimeType,
        durationSec: input.durationSec,
      },
    });
    await enqueueJob("TRANSCRIPTION", { recordingId: recording.id }, tx);
  });

  revalidatePath(`/tech/jobs/${input.projectId}/meeting`);
  return success;
}
