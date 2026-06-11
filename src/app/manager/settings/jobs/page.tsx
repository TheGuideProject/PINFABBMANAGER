import { getFormatter, getTranslations } from "next-intl/server";
import { prisma } from "@/server/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RetryJobButton } from "./retry-button";
import { cn } from "@/lib/utils";

const JOB_BADGE: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700 border-slate-200",
  RUNNING: "bg-sky-100 text-sky-800 border-sky-200",
  SUCCEEDED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
};

export default async function JobsPage() {
  const t = await getTranslations("settings");
  const tEnums = await getTranslations("enums");
  const format = await getFormatter();

  const jobs = await prisma.aiJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">{t("jobs")}</h1>

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">{t("type")}</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>{t("attempts")}</TableHead>
                <TableHead>{t("created")}</TableHead>
                <TableHead>{t("error")}</TableHead>
                <TableHead className="pr-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {t("noJobs")}
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="pl-6 font-mono text-xs">{job.type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={JOB_BADGE[job.status]}>
                        {tEnums(`JobStatus.${job.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {job.attempts}/{job.maxAttempts}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {format.dateTime(job.createdAt, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "max-w-72 truncate text-xs",
                        job.error ? "text-red-600" : "text-muted-foreground",
                      )}
                      title={job.error ?? undefined}
                    >
                      {job.error ?? "—"}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {job.status === "FAILED" ? (
                        <RetryJobButton jobId={job.id} />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
