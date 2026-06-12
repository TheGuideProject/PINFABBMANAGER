import { prisma } from "@/server/db";
import { aiEnabled, extractStructured } from "@/server/services/ai/claude";
import {
  criticalityExtractionSchema,
  type CriticalityExtraction,
} from "@/server/services/ai/schemas";
import { ANALYST_SYSTEM, buildProjectContext } from "@/server/services/ai/prompts";
import { persistCriticalities } from "./shared";
import type { AiJob } from "@/generated/prisma/client";

export async function runMeetingAnalysis(job: AiJob) {
  const { recordingId } = job.payload as { recordingId: string };

  const recording = await prisma.meetingRecording.findUniqueOrThrow({
    where: { id: recordingId },
    include: {
      transcript: true,
      project: { select: { id: true, code: true } },
      technician: { include: { user: { select: { name: true } } } },
    },
  });
  if (!recording.transcript) throw new Error("Transcript not found");

  if (!aiEnabled()) {
    await prisma.meetingRecording.update({
      where: { id: recording.id },
      data: { status: "ANALYZED" },
    });
    return { skipped: "ANTHROPIC_API_KEY missing" };
  }

  const context = await buildProjectContext(recording.project.id);

  const { data, usage } = await extractStructured<CriticalityExtraction>({
    system: ANALYST_SYSTEM,
    userContent: [
      {
        type: "text",
        text: [
          context,
          "",
          `=== MORNING MEETING TRANSCRIPT (${recording.recordedAt.toISOString().slice(0, 10)}, recorded by ${recording.technician.user.name}) ===`,
          "The meeting is between PINFABB technicians, the yard superintendent and other trades.",
          "It may be in English or Italian, with shipyard jargon and imperfect transcription.",
          "",
          recording.transcript.text,
          "",
          "Compare what was said against the project plan above. Extract criticalities — especially schedule conflicts (yard activities that block fin work vs the project end date and milestones), changed dates, out-of-range values mentioned verbally, leaks/damages, missing parts or logistics problems.",
        ].join("\n"),
      },
    ],
    schema: criticalityExtractionSchema as unknown as Record<string, unknown>,
  });

  const created = await persistCriticalities({
    extracted: data.criticalities,
    projectId: recording.project.id,
    projectCode: recording.project.code,
    source: "MEETING",
    technicianId: recording.technicianId,
    transcriptId: recording.transcript.id,
  });

  await prisma.meetingRecording.update({
    where: { id: recording.id },
    data: { status: "ANALYZED" },
  });

  return { created, summary: data.summary, usage };
}
