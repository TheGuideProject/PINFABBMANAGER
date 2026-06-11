import { getFormatter, getTranslations } from "next-intl/server";
import { prisma } from "@/server/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SEVERITY_BADGE, SEVERITY_DOT } from "@/lib/status";

export async function ProjectCriticalities({ projectId }: { projectId: string }) {
  const t = await getTranslations("pages.projects");
  const tEnums = await getTranslations("enums");
  const format = await getFormatter();

  const criticalities = await prisma.criticality.findMany({
    where: { projectId },
    orderBy: [{ status: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
    take: 30,
  });

  if (criticalities.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t("criticalitiesPlaceholder")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {criticalities.map((criticality) => (
        <div
          key={criticality.id}
          className="flex items-start gap-3 rounded-lg border bg-white p-3"
        >
          <span
            className={`mt-1.5 size-2 shrink-0 rounded-full ${SEVERITY_DOT[criticality.severity]}`}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium leading-snug">
              {criticality.title}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {tEnums(`CriticalityCategory.${criticality.category}`)} ·{" "}
              {tEnums(`CriticalitySource.${criticality.source}`)} ·{" "}
              {format.dateTime(criticality.createdAt, {
                day: "numeric",
                month: "short",
              })}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant="outline" className={SEVERITY_BADGE[criticality.severity]}>
              {tEnums(`Severity.${criticality.severity}`)}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {tEnums(`CriticalityStatus.${criticality.status}`)}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
