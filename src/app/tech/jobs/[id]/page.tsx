import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
  MapPin,
  Mic,
  Ship,
} from "lucide-react";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROJECT_STATUS_BADGE } from "@/lib/status";

const LOG_BADGE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  SUBMITTED: "bg-sky-100 text-sky-800 border-sky-200",
  ANALYZED: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export default async function TechJobDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("techJobs");
  const tHome = await getTranslations("techHome");
  const tEnums = await getTranslations("enums");
  const format = await getFormatter();

  const assignment = await prisma.assignment.findFirst({
    where: {
      projectId: id,
      technician: { userId: session.user.id },
      status: { not: "CANCELLED" },
    },
    include: {
      technician: true,
      project: {
        include: {
          vessel: true,
          location: true,
          milestones: { orderBy: { dueDate: "asc" } },
        },
      },
    },
  });
  if (!assignment) notFound();
  const { project } = assignment;

  const logs = await prisma.dailyLog.findMany({
    where: { projectId: id, technicianId: assignment.technicianId },
    orderBy: { logDate: "desc" },
    take: 14,
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Link
          href="/tech"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> {tHome("title")}
        </Link>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg font-semibold leading-snug tracking-tight">
            {project.code} · {project.title}
          </h1>
          <Badge variant="outline" className={PROJECT_STATUS_BADGE[project.status]}>
            {tEnums(`ProjectStatus.${project.status}`)}
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <Ship className="size-4 shrink-0 text-slate-400" aria-hidden />
            {project.vessel.name}
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <MapPin className="size-4 shrink-0 text-slate-400" aria-hidden />
            {project.location.name}, {project.location.country}
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CalendarRange className="size-4 shrink-0 text-slate-400" aria-hidden />
            {format.dateTimeRange(assignment.startDate, assignment.endDate, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-2">
        <Button asChild size="lg" className="w-full">
          <Link href={`/tech/jobs/${project.id}/log`}>
            <ClipboardList className="size-5" aria-hidden /> {t("openLog")}
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="w-full">
          <Link href={`/tech/jobs/${project.id}/meeting`}>
            <Mic className="size-5" aria-hidden /> {tHome("meetingButton")}
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="w-full">
          <Link href={`/tech/jobs/${project.id}/report`}>
            <FileText className="size-5" aria-hidden /> {tHome("reportButton")}
          </Link>
        </Button>
      </div>

      {project.milestones.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("milestones")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {project.milestones.map((milestone) => (
              <div key={milestone.id} className="flex items-center gap-2 text-sm">
                {milestone.done ? (
                  <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
                ) : (
                  <Circle className="size-4 text-slate-300" aria-hidden />
                )}
                <span className={milestone.done ? "text-muted-foreground line-through" : ""}>
                  {milestone.name}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {format.dateTime(milestone.dueDate, {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("history")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noLogs")}</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span>
                  {format.dateTime(log.logDate, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <Badge variant="outline" className={LOG_BADGE[log.status]}>
                  {tEnums(`DailyLogStatus.${log.status}`)}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
