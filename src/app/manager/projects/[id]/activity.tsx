import { getFormatter, getTranslations } from "next-intl/server";
import { prisma } from "@/server/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PhotoGrid } from "@/components/photos/photo-grid";
import { cn } from "@/lib/utils";

export async function ProjectActivity({ projectId }: { projectId: string }) {
  const t = await getTranslations("pages.projects");
  const tTech = await getTranslations("techJobs");
  const tEnums = await getTranslations("enums");
  const format = await getFormatter();

  const logs = await prisma.dailyLog.findMany({
    where: { projectId, status: { in: ["SUBMITTED", "ANALYZED"] } },
    include: {
      technician: { include: { user: { select: { name: true } } } },
      measurements: { orderBy: { id: "asc" } },
      photos: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { logDate: "desc" },
  });

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t("activityEmpty")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <Card key={log.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">
              {format.dateTime(log.logDate, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}{" "}
              <span className="font-normal text-muted-foreground">
                {t("byTechnician", { name: log.technician.user.name })}
                {log.workHours !== null ? ` · ${log.workHours}h` : ""}
              </span>
            </CardTitle>
            <Badge
              variant="outline"
              className={
                log.status === "ANALYZED"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-sky-200 bg-sky-50 text-sky-800"
              }
            >
              {tEnums(`DailyLogStatus.${log.status}`)}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {log.notes ? (
              <p className="whitespace-pre-wrap text-sm text-slate-700">{log.notes}</p>
            ) : null}

            {log.measurements.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">{tTech("measurements")}</TableHead>
                      <TableHead>{tTech("finPosition")}</TableHead>
                      <TableHead className="text-right">{tTech("value")}</TableHead>
                      <TableHead className="pr-4" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {log.measurements.map((measurement) => (
                      <TableRow
                        key={measurement.id}
                        className={cn(measurement.withinSpec === false && "bg-red-50")}
                      >
                        <TableCell className="pl-4">{measurement.name}</TableCell>
                        <TableCell>
                          {measurement.finPosition
                            ? tEnums(`FinPosition.${measurement.finPosition}`)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {measurement.value} {measurement.unit}
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          {measurement.withinSpec !== null ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                measurement.withinSpec
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-red-300 bg-red-100 text-red-700",
                              )}
                            >
                              {measurement.withinSpec
                                ? tTech("withinSpec")
                                : tTech("outOfSpec")}
                            </Badge>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            {log.photos.length > 0 ? (
              <PhotoGrid
                photos={log.photos.map((photo) => ({
                  id: photo.id,
                  storageKey: photo.storageKey,
                  category: photo.category,
                  caption: photo.caption,
                }))}
              />
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
