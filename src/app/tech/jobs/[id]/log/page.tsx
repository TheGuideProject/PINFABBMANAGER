import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/server/db";
import { ensureTodayLog } from "@/server/actions/daily-logs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { Measurements } from "./measurements";
import { LogDetailsForm, SubmitLogButton } from "./log-controls";
import { PhotoCapture } from "./photo-capture";

const LOG_BADGE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  SUBMITTED: "bg-sky-100 text-sky-800 border-sky-200",
  ANALYZED: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export default async function DailyLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const t = await getTranslations("techJobs");
  const tEnums = await getTranslations("enums");
  const format = await getFormatter();

  let logId: string;
  try {
    const log = await ensureTodayLog(projectId);
    logId = log.id;
  } catch {
    notFound();
  }

  const log = await prisma.dailyLog.findUnique({
    where: { id: logId },
    include: {
      project: { select: { id: true, code: true, title: true } },
      measurements: { orderBy: { id: "asc" } },
      photos: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!log) notFound();

  const standards = await prisma.measurementStandard.findMany({
    where: { OR: [{ projectId: null }, { projectId }] },
    orderBy: { name: "asc" },
  });

  const editable = log.status === "DRAFT";

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Link
          href={`/tech/jobs/${projectId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> {log.project.code}
        </Link>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold tracking-tight">
            {t("logFor", {
              date: format.dateTime(log.logDate, {
                day: "numeric",
                month: "long",
              }),
            })}
          </h1>
          <Badge variant="outline" className={LOG_BADGE[log.status]}>
            {tEnums(`DailyLogStatus.${log.status}`)}
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-5">
          {editable ? (
            <LogDetailsForm
              logId={log.id}
              notes={log.notes}
              workHours={log.workHours}
            />
          ) : (
            <div className="space-y-2 text-sm">
              {log.notes ? (
                <p className="whitespace-pre-wrap">{log.notes}</p>
              ) : null}
              {log.workHours !== null ? (
                <p className="text-muted-foreground">
                  {t("workHours")}: {log.workHours}h
                </p>
              ) : null}
            </div>
          )}

          <Separator />

          <Measurements
            logId={log.id}
            editable={editable}
            measurements={log.measurements.map((measurement) => ({
              id: measurement.id,
              name: measurement.name,
              value: measurement.value,
              unit: measurement.unit,
              finPosition: measurement.finPosition,
              withinSpec: measurement.withinSpec,
            }))}
            standards={standards.map((standard) => ({
              id: standard.id,
              name: standard.name,
              unit: standard.unit,
              minValue: standard.minValue,
              maxValue: standard.maxValue,
            }))}
          />

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("photos")}</h2>
              {editable ? (
                <PhotoCapture projectId={projectId} dailyLogId={log.id} />
              ) : null}
            </div>
            <PhotoGrid
              photos={log.photos.map((photo) => ({
                id: photo.id,
                storageKey: photo.storageKey,
                category: photo.category,
                caption: photo.caption,
              }))}
              canDelete={editable}
            />
          </div>
        </CardContent>
      </Card>

      {editable ? <SubmitLogButton logId={log.id} /> : null}
    </div>
  );
}
