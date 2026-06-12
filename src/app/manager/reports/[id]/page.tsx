import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/server/db";
import { parseStructure } from "@/lib/report-template";
import { ReportEditor } from "@/components/reports/report-editor";

export default async function ManagerReportDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("reports");

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      template: true,
      signatures: { orderBy: { signedAt: "asc" } },
      project: { include: { vessel: true } },
    },
  });
  if (!report) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="space-y-1">
        <Link
          href="/manager/reports"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> {t("title")}
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">
          {report.project.code} · {report.project.vessel.name}
        </h1>
      </div>

      <ReportEditor
        role="MANAGER"
        report={{
          id: report.id,
          status: report.status,
          version: report.version,
          generatedAt: report.generatedAt,
          content: (report.content ?? {}) as Record<string, string>,
          sections: parseStructure(report.template.structure),
          pdfStorageKey: report.pdfStorageKey,
          signedScanStorageKey: report.signedScanStorageKey,
          finalPdfStorageKey: report.finalPdfStorageKey,
          signatures: report.signatures.map((signature) => ({
            id: signature.id,
            kind: signature.kind,
            signerName: signature.signerName,
            signedAt: signature.signedAt,
          })),
        }}
      />
    </div>
  );
}
