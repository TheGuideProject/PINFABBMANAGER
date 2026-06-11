import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";
import { prisma } from "@/server/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapSection } from "@/components/map/map-section";

const ACTIVE_STATUSES = ["PLANNED", "MOBILIZING", "IN_PROGRESS", "ON_HOLD"] as const;

export default async function MapPage() {
  const t = await getTranslations("pages.map");
  const tLocations = await getTranslations("pages.locations");
  const tEnums = await getTranslations("enums");

  const locations = await prisma.location.findMany({
    include: {
      projects: {
        where: { status: { in: [...ACTIVE_STATUSES] } },
        select: { id: true, code: true, title: true, status: true },
        orderBy: { startDate: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/manager/locations">
            <MapPin className="size-4" aria-hidden /> {tLocations("manage")}
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">{t("legend")}:</span>
        {ACTIVE_STATUSES.map((status) => (
          <Badge key={status} variant="outline" className="gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{
                background: {
                  PLANNED: "#94a3b8",
                  MOBILIZING: "#f59e0b",
                  IN_PROGRESS: "#0ea5e9",
                  ON_HOLD: "#f97316",
                }[status],
              }}
              aria-hidden
            />
            {tEnums(`ProjectStatus.${status}`)}
          </Badge>
        ))}
      </div>

      <MapSection
        locations={locations.map((location) => ({
          id: location.id,
          name: location.name,
          city: location.city,
          country: location.country,
          lat: location.lat,
          lng: location.lng,
          projects: location.projects,
        }))}
      />
    </div>
  );
}
