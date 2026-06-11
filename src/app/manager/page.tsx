import { getFormatter, getTranslations } from "next-intl/server";
import {
  AlertTriangle,
  CalendarClock,
  FolderKanban,
  Plane,
} from "lucide-react";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PROJECT_STATUS_BADGE, SEVERITY_DOT } from "@/lib/status";

const ACTIVE_STATUSES = ["MOBILIZING", "IN_PROGRESS", "ON_HOLD"] as const;

export default async function ManagerDashboard() {
  const session = await auth();
  const t = await getTranslations("dashboard");
  const tEnums = await getTranslations("enums");
  const format = await getFormatter();

  const now = new Date();
  const in14days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [
    activeProjects,
    deployedTechnicians,
    openCriticalities,
    endingSoon,
    recentCriticalities,
    statusCounts,
  ] = await Promise.all([
    prisma.project.count({ where: { status: { in: [...ACTIVE_STATUSES] } } }),
    prisma.assignment.count({
      where: {
        status: { in: ["CONFIRMED", "ACTIVE"] },
        startDate: { lte: now },
        endDate: { gte: now },
      },
    }),
    prisma.criticality.count({
      where: { status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] } },
    }),
    prisma.project.findMany({
      where: {
        status: { in: [...ACTIVE_STATUSES, "PLANNED"] },
        endDate: { gte: now, lte: in14days },
      },
      include: { vessel: true, location: true },
      orderBy: { endDate: "asc" },
      take: 6,
    }),
    prisma.criticality.findMany({
      where: { status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] } },
      include: { project: { include: { vessel: true } } },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.project.groupBy({ by: ["status"], _count: true }),
  ]);

  const stats = [
    {
      label: t("activeProjects"),
      value: activeProjects,
      icon: FolderKanban,
      tone: "text-sky-600 bg-sky-50",
    },
    {
      label: t("techniciansDeployed"),
      value: deployedTechnicians,
      icon: Plane,
      tone: "text-indigo-600 bg-indigo-50",
    },
    {
      label: t("openCriticalities"),
      value: openCriticalities,
      icon: AlertTriangle,
      tone: "text-orange-600 bg-orange-50",
    },
    {
      label: t("endingSoon"),
      value: endingSoon.length,
      icon: CalendarClock,
      tone: "text-emerald-600 bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("welcome", { name: session?.user.name?.split(" ")[0] ?? "" })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4">
              <div
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tone}`}
              >
                <Icon className="size-5" aria-hidden />
              </div>
              <div>
                <div className="text-2xl font-semibold leading-none">{value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("upcomingDeadlines")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {endingSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noDeadlines")}</p>
            ) : (
              endingSoon.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {project.code} · {project.vessel.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {project.location.name}, {project.location.country} ·{" "}
                      {t("ends", {
                        date: format.dateTime(project.endDate, {
                          day: "numeric",
                          month: "short",
                        }),
                      })}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={PROJECT_STATUS_BADGE[project.status]}
                  >
                    {tEnums(`ProjectStatus.${project.status}`)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("recentCriticalities")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentCriticalities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noCriticalities")}</p>
            ) : (
              recentCriticalities.map((criticality) => (
                <div
                  key={criticality.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${SEVERITY_DOT[criticality.severity]}`}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {criticality.title}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {criticality.project.vessel.name} ·{" "}
                      {tEnums(`Severity.${criticality.severity}`)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("fleetOverview")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {statusCounts.map((row) => (
            <Badge
              key={row.status}
              variant="outline"
              className={`${PROJECT_STATUS_BADGE[row.status]} px-3 py-1.5 text-sm`}
            >
              {tEnums(`ProjectStatus.${row.status}`)}: {row._count}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
