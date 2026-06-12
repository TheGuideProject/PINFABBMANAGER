import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { parseStructure } from "@/lib/report-template";
import { ReportEditor } from "@/components/reports/report-editor";
import { CreateReportButton } from "./create-report-button";

export default async function TechReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("reports");

  const assignment = await prisma.assignment.findFirst({
    where: {
      projectId,
      technician: { userId: session.user.id },
      status: { not: "CANCELLED" },
    },
    include: { project: { select: { code: true } } },
  });
  if (!assignment) notFound();

  const report = await prisma.report.findFirst({
    where: { projectId, status: { notIn: ["ARCHIVED"] } },
    include: {
      template: true,
      signatures: { orderBy: { signedAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Link
          href={`/tech/jobs/${projectId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> {assignment.project.code}
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">{t("report")}</h1>
      </div>

      {!report ? (
        <CreateReportButton projectId={projectId} />
      ) : (
        <ReportEditor
          role="TECHNICIAN"
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
      )}
    </div>
  );
}
