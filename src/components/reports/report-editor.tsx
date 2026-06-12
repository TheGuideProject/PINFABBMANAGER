"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import {
  Download,
  FileCheck,
  Loader2,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SignatureDialog } from "@/components/signature/signature-dialog";
import {
  finalizeReport,
  regenerateSection,
  saveReportSection,
  uploadSignedScan,
} from "@/server/actions/reports";
import {
  sectionTitle,
  type TemplateSection,
} from "@/lib/report-template";

export type ReportEditorData = {
  id: string;
  status: string;
  version: number;
  generatedAt: Date | null;
  content: Record<string, string>;
  sections: TemplateSection[];
  pdfStorageKey: string | null;
  signedScanStorageKey: string | null;
  finalPdfStorageKey: string | null;
  signatures: { id: string; kind: string; signerName: string; signedAt: Date }[];
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  GENERATED: "bg-sky-100 text-sky-800 border-sky-200",
  IN_REVIEW: "bg-amber-100 text-amber-800 border-amber-200",
  FINALIZED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  SIGNED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  COUNTERSIGNED: "bg-emerald-200 text-emerald-900 border-emerald-300",
  ARCHIVED: "bg-slate-100 text-slate-500 border-slate-200",
};

function SectionEditor({
  report,
  section,
  editable,
}: {
  report: ReportEditorData;
  section: TemplateSection;
  editable: boolean;
}) {
  const t = useTranslations("reports");
  const tForms = useTranslations("forms");
  const locale = useLocale();
  const router = useRouter();
  const [text, setText] = useState(report.content[section.key] ?? "");
  const [pending, startTransition] = useTransition();

  const isAuto = !["text", "table"].includes(section.kind);

  const save = () => {
    const formData = new FormData();
    formData.set("sectionKey", section.key);
    formData.set("text", text);
    startTransition(async () => {
      const result = await saveReportSection(report.id, formData);
      if (result.ok) toast.success(tForms("saved"));
      else toast.error(tForms(`errors.${result.error}`));
    });
  };

  const regenerate = () => {
    startTransition(async () => {
      const result = await regenerateSection(report.id, section.key);
      if (result.ok) {
        toast.success(t("creating"));
        router.refresh();
      } else toast.error(tForms(`errors.${result.error}`));
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">{sectionTitle(section, locale)}</CardTitle>
        {!isAuto && editable ? (
          <Button variant="ghost" size="sm" onClick={regenerate} disabled={pending}>
            <RefreshCw className="size-3.5" aria-hidden /> {t("regenerate")}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {isAuto ? (
          <p className="text-sm italic text-muted-foreground">{t("autoSection")}</p>
        ) : editable ? (
          <div className="space-y-2">
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={Math.min(14, Math.max(4, text.split("\n").length + 1))}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={save}
              disabled={pending || text === (report.content[section.key] ?? "")}
            >
              {pending ? tForms("saving") : tForms("save")}
            </Button>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {report.content[section.key] || "—"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ReportEditor({
  report,
  role,
}: {
  report: ReportEditorData;
  role: "TECHNICIAN" | "MANAGER";
}) {
  const t = useTranslations("reports");
  const tEnums = useTranslations("enums");
  const tForms = useTranslations("forms");
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const editable = ["DRAFT", "GENERATED", "IN_REVIEW"].includes(report.status);
  const signable = ["FINALIZED", "SIGNED"].includes(report.status);

  const onFinalize = () => {
    startTransition(async () => {
      const result = await finalizeReport(report.id);
      if (result.ok) {
        toast.success(tForms("saved"));
        router.refresh();
      } else toast.error(tForms(`errors.${result.error}`));
    });
  };

  const onScanUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    const formData = new FormData();
    for (const file of files) formData.append("pages", file);
    startTransition(async () => {
      const result = await uploadSignedScan(report.id, formData);
      if (result.ok) {
        toast.success(tForms("saved"));
        router.refresh();
      } else toast.error(tForms(`errors.${result.error}`));
    });
  };

  const waitingGeneration =
    report.status === "DRAFT" &&
    !report.sections.some((section) => report.content[section.key]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={STATUS_BADGE[report.status]}>
          {tEnums(`ReportStatus.${report.status}`)}
        </Badge>
        {report.generatedAt ? (
          <span className="text-xs text-muted-foreground">
            {t("generatedAt", {
              date: format.dateTime(report.generatedAt, {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }),
            })}
          </span>
        ) : null}
        <div className="ml-auto flex flex-wrap gap-2">
          {report.pdfStorageKey ? (
            <Button asChild variant="outline" size="sm">
              <a href={`/api/files/${report.pdfStorageKey}`} target="_blank">
                <Download className="size-4" aria-hidden /> {t("downloadPdf")}
              </a>
            </Button>
          ) : null}
          {report.signedScanStorageKey ? (
            <Button asChild variant="outline" size="sm">
              <a href={`/api/files/${report.signedScanStorageKey}`} target="_blank">
                <Download className="size-4" aria-hidden /> {t("downloadScan")}
              </a>
            </Button>
          ) : null}
          {report.finalPdfStorageKey &&
          report.finalPdfStorageKey !== report.pdfStorageKey ? (
            <Button asChild size="sm">
              <a href={`/api/files/${report.finalPdfStorageKey}`} target="_blank">
                <Download className="size-4" aria-hidden /> {t("downloadFinal")}
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {waitingGeneration ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("waitingGeneration")}
          </CardContent>
        </Card>
      ) : null}

      {report.sections
        .filter((section) => section.key !== "cover")
        .map((section) => (
          <SectionEditor
            key={section.key}
            report={report}
            section={section}
            editable={editable}
          />
        ))}

      {report.signatures.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("signatures")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {report.signatures.map((signature) => (
              <div key={signature.id} className="flex items-center gap-2 text-sm">
                <FileCheck className="size-4 text-emerald-500" aria-hidden />
                <span className="font-medium">{signature.signerName}</span>
                <Badge variant="outline" className="text-[10px]">
                  {tEnums(`SignatureKind.${signature.kind}`)}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  {format.dateTime(signature.signedAt, {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {editable && !waitingGeneration ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" className="flex-1" disabled={pending}>
                <FileCheck className="size-4" aria-hidden /> {t("finalize")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("finalize")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("finalizeConfirm")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>
                  {tForms("cancel")}
                </AlertDialogCancel>
                <AlertDialogAction onClick={onFinalize} disabled={pending}>
                  {t("finalize")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}

        {signable && role === "TECHNICIAN" ? (
          <>
            <SignatureDialog
              reportId={report.id}
              kinds={["INSPECTOR", "TECHNICIAN", "CLIENT"]}
              triggerLabel={t("signCanvas")}
              onDone={() => router.refresh()}
            />
            <label className="inline-flex">
              <input
                type="file"
                accept="image/jpeg,image/png"
                capture="environment"
                multiple
                hidden
                onChange={onScanUpload}
              />
              <Button variant="outline" disabled={pending} asChild>
                <span>
                  <UploadCloud className="size-4" aria-hidden /> {t("uploadScan")}
                </span>
              </Button>
            </label>
          </>
        ) : null}

        {signable && role === "MANAGER" ? (
          <SignatureDialog
            reportId={report.id}
            kinds={["MANAGER"]}
            triggerLabel={t("countersign")}
            onDone={() => router.refresh()}
          />
        ) : null}
      </div>
    </div>
  );
}
