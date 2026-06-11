import { getTranslations } from "next-intl/server";
import { prisma } from "@/server/db";
import { Card, CardContent } from "@/components/ui/card";
import { CriticalityFilters } from "./filters";
import { CriticalityCard } from "./criticality-card";
import type {
  CriticalitySource,
  CriticalityStatus,
  Severity,
} from "@/generated/prisma/enums";

export default async function CriticalitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; severity?: string; source?: string }>;
}) {
  const filters = await searchParams;
  const t = await getTranslations("criticalities");

  const criticalities = await prisma.criticality.findMany({
    where: {
      ...(filters.status
        ? { status: filters.status as CriticalityStatus }
        : { status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] } }),
      ...(filters.severity ? { severity: filters.severity as Severity } : {}),
      ...(filters.source ? { source: filters.source as CriticalitySource } : {}),
    },
    include: {
      project: {
        include: {
          vessel: { select: { name: true } },
          location: { select: { name: true, country: true } },
          assignments: {
            where: { status: { not: "CANCELLED" } },
            include: { technician: { include: { user: { select: { name: true } } } } },
          },
        },
      },
      technician: { include: { user: { select: { name: true } } } },
      dailyLog: { select: { notes: true } },
      transcript: { select: { text: true } },
      directives: {
        include: { toTechnician: { include: { user: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  const openCount = await prisma.criticality.count({
    where: { status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] } },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("title")}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({t("openCount", { count: openCount })})
          </span>
        </h1>
      </div>

      <CriticalityFilters />

      {criticalities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t("empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {criticalities.map((criticality) => (
            <CriticalityCard
              key={criticality.id}
              data={{
                id: criticality.id,
                title: criticality.title,
                description: criticality.description,
                recommendedAction: criticality.recommendedAction,
                severity: criticality.severity,
                category: criticality.category,
                status: criticality.status,
                source: criticality.source,
                finPosition: criticality.finPosition,
                createdAt: criticality.createdAt,
                aiConfidence: criticality.aiConfidence,
                projectId: criticality.projectId,
                projectCode: criticality.project.code,
                vesselName: criticality.project.vessel.name,
                locationName: `${criticality.project.location.name}, ${criticality.project.location.country}`,
                technicianName: criticality.technician?.user.name ?? null,
                sourceExcerpt:
                  criticality.dailyLog?.notes ??
                  (criticality.transcript
                    ? criticality.transcript.text.slice(0, 1200)
                    : null),
                directives: criticality.directives.map((directive) => ({
                  id: directive.id,
                  message: directive.message,
                  status: directive.status,
                  toName: directive.toTechnician.user.name,
                })),
                team: criticality.project.assignments.map((assignment) => ({
                  value: assignment.technicianId,
                  label: assignment.technician.user.name,
                })),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
