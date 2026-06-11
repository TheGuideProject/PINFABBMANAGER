import { getFormatter, getTranslations } from "next-intl/server";
import { Ship, MapPin, CalendarRange } from "lucide-react";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PROJECT_STATUS_BADGE } from "@/lib/status";

export default async function TechHome() {
  const session = await auth();
  const t = await getTranslations("techHome");
  const tEnums = await getTranslations("enums");
  const format = await getFormatter();

  const assignments = await prisma.assignment.findMany({
    where: {
      technician: { userId: session!.user.id },
      status: { not: "CANCELLED" },
    },
    include: {
      project: {
        include: { vessel: true, location: true },
      },
    },
    orderBy: { startDate: "asc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t("noJobs")}
          </CardContent>
        </Card>
      ) : (
        assignments.map((assignment) => {
          const { project } = assignment;
          return (
            <Card key={assignment.id} className="overflow-hidden">
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">
                      {project.code}
                    </div>
                    <div className="text-base font-semibold leading-snug">
                      {project.title}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={PROJECT_STATUS_BADGE[project.status]}
                  >
                    {tEnums(`ProjectStatus.${project.status}`)}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Ship className="size-4 shrink-0 text-slate-400" aria-hidden />
                    <span className="truncate">{project.vessel.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="size-4 shrink-0 text-slate-400" aria-hidden />
                    <span className="truncate">
                      {project.location.name}, {project.location.country}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <CalendarRange
                      className="size-4 shrink-0 text-slate-400"
                      aria-hidden
                    />
                    <span>
                      {format.dateTimeRange(assignment.startDate, assignment.endDate, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-muted-foreground">
                    {t("role")}: {tEnums(`AssignmentRole.${assignment.role}`)}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
