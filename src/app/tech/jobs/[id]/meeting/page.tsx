import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ArrowLeft, FileText } from "lucide-react";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MeetingRecorder } from "./recorder";

const RECORDING_BADGE: Record<string, string> = {
  UPLOADED: "bg-slate-100 text-slate-700 border-slate-200",
  TRANSCRIBING: "bg-amber-100 text-amber-800 border-amber-200",
  TRANSCRIBED: "bg-sky-100 text-sky-800 border-sky-200",
  ANALYZED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
};

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("meeting");
  const tEnums = await getTranslations("enums");
  const format = await getFormatter();

  const assignment = await prisma.assignment.findFirst({
    where: {
      projectId,
      technician: { userId: session.user.id },
      status: { not: "CANCELLED" },
    },
    include: { project: { select: { code: true } } },
  });
  if (!assignment) notFound();

  const recordings = await prisma.meetingRecording.findMany({
    where: { projectId, technicianId: assignment.technicianId },
    include: { transcript: { select: { id: true, text: true } } },
    orderBy: { recordedAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Link
          href={`/tech/jobs/${projectId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> {assignment.project.code}
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
      </div>

      <MeetingRecorder projectId={projectId} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("history")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recordings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noRecordings")}</p>
          ) : (
            recordings.map((recording) => (
              <div
                key={recording.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <div>
                  <div className="font-medium">
                    {format.dateTime(recording.recordedAt, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {recording.durationSec
                      ? `${Math.round(recording.durationSec / 60)} min`
                      : "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={RECORDING_BADGE[recording.status]}
                  >
                    {tEnums(`RecordingStatus.${recording.status}`)}
                  </Badge>
                  {recording.transcript ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={t("transcript")}>
                          <FileText className="size-4" aria-hidden />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[85dvh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{t("transcript")}</DialogTitle>
                        </DialogHeader>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {recording.transcript.text}
                        </p>
                      </DialogContent>
                    </Dialog>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
