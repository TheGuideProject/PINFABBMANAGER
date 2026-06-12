import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Download } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/forms/search-input";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  GENERATED: "bg-sky-100 text-sky-800 border-sky-200",
  IN_REVIEW: "bg-amber-100 text-amber-800 border-amber-200",
  FINALIZED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  SIGNED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  COUNTERSIGNED: "bg-emerald-200 text-emerald-900 border-emerald-300",
  ARCHIVED: "bg-slate-100 text-slate-500 border-slate-200",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const t = await getTranslations("reports");
  const tEnums = await getTranslations("enums");
  const tEntities = await getTranslations("entities");
  const tForms = await getTranslations("forms");
  const format = await getFormatter();

  const reports = await prisma.report.findMany({
    where: q
      ? {
          project: {
            OR: [
              { code: { contains: q, mode: "insensitive" } },
              { vessel: { name: { contains: q, mode: "insensitive" } } },
              { client: { name: { contains: q, mode: "insensitive" } } },
            ],
          },
        }
      : undefined,
    include: {
      project: {
        include: { vessel: true, client: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
      <SearchInput placeholder={tForms("search")} />

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">{t("project")}</TableHead>
                <TableHead>{tEntities("vessel")}</TableHead>
                <TableHead>{tEntities("client")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("version")}</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="pr-6 text-right">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => {
                  const downloadKey =
                    report.finalPdfStorageKey ?? report.pdfStorageKey;
                  return (
                    <TableRow key={report.id}>
                      <TableCell className="pl-6">
                        <Link
                          href={`/manager/reports/${report.id}`}
                          className="font-medium text-sky-700 hover:underline"
                        >
                          {report.project.code}
                        </Link>
                      </TableCell>
                      <TableCell>{report.project.vessel.name}</TableCell>
                      <TableCell>{report.project.client.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_BADGE[report.status]}>
                          {tEnums(`ReportStatus.${report.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>v{report.version}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {format.dateTime(report.updatedAt, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        {downloadKey ? (
                          <Button asChild variant="ghost" size="icon-sm">
                            <a
                              href={`/api/files/${downloadKey}`}
                              target="_blank"
                              aria-label={t("downloadPdf")}
                            >
                              <Download className="size-4" aria-hidden />
                            </a>
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
