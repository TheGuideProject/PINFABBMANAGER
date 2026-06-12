import { getTranslations } from "next-intl/server";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Timer,
} from "lucide-react";
import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryBarChart, DurationChart } from "@/components/analytics/charts";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AnalyticsPage() {
  const t = await getTranslations("analytics");
  const tEnums = await getTranslations("enums");

  const [
    completedProjects,
    countersignedReports,
    resolvedCriticalities,
    criticalities,
    technicians,
    completedWithDates,
    directives,
  ] = await Promise.all([
    prisma.project.count({ where: { status: "COMPLETED" } }),
    prisma.report.count({ where: { status: "COUNTERSIGNED" } }),
    prisma.criticality.count({ where: { status: "RESOLVED" } }),
    prisma.criticality.findMany({
      include: { project: { include: { client: { select: { name: true } } } } },
    }),
    prisma.technician.findMany({
      include: {
        user: { select: { name: true, active: true } },
        dailyLogs: {
          where: { status: { in: ["SUBMITTED", "ANALYZED"] } },
          include: { measurements: { select: { withinSpec: true } } },
        },
        criticalities: { select: { id: true } },
        assignments: {
          where: { status: "COMPLETED" },
          select: { id: true },
        },
      },
    }),
    prisma.project.findMany({
      where: { status: "COMPLETED", actualStart: { not: null }, actualEnd: { not: null } },
      select: {
        type: true,
        startDate: true,
        endDate: true,
        actualStart: true,
        actualEnd: true,
      },
    }),
    prisma.directive.findMany({
      where: { acknowledgedAt: { not: null } },
      select: { createdAt: true, acknowledgedAt: true, toTechnicianId: true },
    }),
  ]);

  // Resolution time for resolved/dismissed criticalities
  const resolved = criticalities.filter((criticality) => criticality.resolvedAt);
  const avgResolutionDays =
    resolved.length > 0
      ? resolved.reduce(
          (sum, criticality) =>
            sum +
            (criticality.resolvedAt!.getTime() - criticality.createdAt.getTime()) /
              DAY_MS,
          0,
        ) / resolved.length
      : null;

  const stats = [
    { label: t("completedProjects"), value: completedProjects, icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50" },
    { label: t("countersignedReports"), value: countersignedReports, icon: FileCheck, tone: "text-sky-600 bg-sky-50" },
    { label: t("resolvedCriticalities"), value: resolvedCriticalities, icon: AlertTriangle, tone: "text-orange-600 bg-orange-50" },
    { label: t("avgResolutionDays"), value: avgResolutionDays !== null ? avgResolutionDays.toFixed(1) : "—", icon: Timer, tone: "text-indigo-600 bg-indigo-50" },
  ];

  // Criticalities by category / by client
  const byCategory = new Map<string, number>();
  const byClient = new Map<string, number>();
  for (const criticality of criticalities) {
    const category = tEnums(`CriticalityCategory.${criticality.category}`);
    byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
    const client = criticality.project.client.name;
    byClient.set(client, (byClient.get(client) ?? 0) + 1);
  }
  const categoryData = [...byCategory.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const clientData = [...byClient.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Planned vs actual by project type
  const byType = new Map<string, { planned: number[]; actual: number[] }>();
  for (const project of completedWithDates) {
    const key = tEnums(`ProjectType.${project.type}`);
    const entry = byType.get(key) ?? { planned: [], actual: [] };
    entry.planned.push(
      (project.endDate.getTime() - project.startDate.getTime()) / DAY_MS,
    );
    entry.actual.push(
      (project.actualEnd!.getTime() - project.actualStart!.getTime()) / DAY_MS,
    );
    byType.set(key, entry);
  }
  const avg = (values: number[]) =>
    values.length > 0
      ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
      : 0;
  const durationData = [...byType.entries()].map(([name, entry]) => ({
    name,
    planned: avg(entry.planned),
    actual: avg(entry.actual),
  }));

  // Technician performance
  const ackByTechnician = new Map<string, number[]>();
  for (const directive of directives) {
    const hours =
      (directive.acknowledgedAt!.getTime() - directive.createdAt.getTime()) /
      (60 * 60 * 1000);
    const list = ackByTechnician.get(directive.toTechnicianId) ?? [];
    list.push(hours);
    ackByTechnician.set(directive.toTechnicianId, list);
  }

  const performance = technicians
    .filter((technician) => technician.user.active)
    .map((technician) => {
      const measurements = technician.dailyLogs.flatMap((log) => log.measurements);
      const checked = measurements.filter(
        (measurement) => measurement.withinSpec !== null,
      );
      const outOfSpec = checked.filter(
        (measurement) => measurement.withinSpec === false,
      );
      const ackTimes = ackByTechnician.get(technician.id) ?? [];
      return {
        id: technician.id,
        name: technician.user.name,
        logs: technician.dailyLogs.length,
        outOfSpecRate:
          checked.length > 0
            ? `${Math.round((outOfSpec.length / checked.length) * 100)}% (${outOfSpec.length}/${checked.length})`
            : "—",
        criticalities: technician.criticalities.length,
        jobsCompleted: technician.assignments.length,
        ackLatency:
          ackTimes.length > 0
            ? `${(ackTimes.reduce((sum, value) => sum + value, 0) / ackTimes.length).toFixed(1)}h`
            : "—",
      };
    })
    .sort((a, b) => b.logs - a.logs);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4">
              <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
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
            <CardTitle className="text-base">{t("criticalitiesByCategory")}</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("noData")}</p>
            ) : (
              <CategoryBarChart data={categoryData} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("criticalitiesByClient")}</CardTitle>
          </CardHeader>
          <CardContent>
            {clientData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("noData")}</p>
            ) : (
              <CategoryBarChart data={clientData} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("durations")}</CardTitle>
        </CardHeader>
        <CardContent>
          {durationData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("noData")}</p>
          ) : (
            <DurationChart data={durationData} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("techPerformance")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">{t("technician")}</TableHead>
                <TableHead className="text-center">{t("logsSubmitted")}</TableHead>
                <TableHead className="text-center">{t("outOfSpecRate")}</TableHead>
                <TableHead className="text-center">{t("criticalitiesRaised")}</TableHead>
                <TableHead className="text-center">{t("jobsCompleted")}</TableHead>
                <TableHead className="pr-6 text-center">{t("ackLatency")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performance.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-6 font-medium">{row.name}</TableCell>
                  <TableCell className="text-center">{row.logs}</TableCell>
                  <TableCell className="text-center">{row.outOfSpecRate}</TableCell>
                  <TableCell className="text-center">{row.criticalities}</TableCell>
                  <TableCell className="text-center">{row.jobsCompleted}</TableCell>
                  <TableCell className="pr-6 text-center">{row.ackLatency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
