import { prisma } from "@/server/db";
import { storage } from "@/server/services/storage";
import { transcription } from "@/server/services/transcription";
import { enqueueJob } from "@/server/jobs/enqueue";
import { readToBuffer } from "./shared";
import type { AiJob } from "@/generated/prisma/client";

export async function runTranscription(job: AiJob) {
  const { recordingId } = job.payload as { recordingId: string };

  const recording = await prisma.meetingRecording.findUniqueOrThrow({
    where: { id: recordingId },
  });
  if (recording.status === "TRANSCRIBED" || recording.status === "ANALYZED") {
    return { skipped: "already transcribed" };
  }

  await prisma.meetingRecording.update({
    where: { id: recording.id },
    data: { status: "TRANSCRIBING" },
  });

  try {
    const audio = await readToBuffer(await storage.getStream(recording.storageKey));
    const result = await transcription.transcribe(audio, recording.mimeType);

    await prisma.$transaction(async (tx) => {
      await tx.transcript.upsert({
        where: { recordingId: recording.id },
        create: {
          recordingId: recording.id,
          text: result.text,
          language: result.language,
          provider: result.provider,
        },
        update: { text: result.text, language: result.language },
      });
      await tx.meetingRecording.update({
        where: { id: recording.id },
        data: {
          status: "TRANSCRIBED",
          durationSec: result.durationSec ?? recording.durationSec,
        },
      });
      await enqueueJob("MEETING_ANALYSIS", { recordingId: recording.id }, tx);
    });

    return {
      chars: result.text.length,
      durationSec: result.durationSec,
      language: result.language,
    };
  } catch (error) {
    await prisma.meetingRecording.update({
      where: { id: recording.id },
      data: { status: "FAILED" },
    });
    throw error;
  }
}
