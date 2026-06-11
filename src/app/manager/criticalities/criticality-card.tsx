"use client";

import { useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Check, CircleDot, Loader2, Send, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormDialog } from "@/components/forms/form-dialog";
import { SelectField } from "@/components/forms/fields";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  sendDirective,
  setCriticalityStatus,
} from "@/server/actions/criticalities";
import { SEVERITY_BADGE } from "@/lib/status";
import type {
  CriticalityStatus,
  Severity,
} from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export type CriticalityCardData = {
  id: string;
  title: string;
  description: string;
  recommendedAction: string | null;
  severity: Severity;
  category: string;
  status: CriticalityStatus;
  source: string;
  finPosition: string | null;
  createdAt: Date;
  aiConfidence: number | null;
  projectId: string;
  projectCode: string;
  vesselName: string;
  locationName: string;
  technicianName: string | null;
  sourceExcerpt: string | null;
  directives: { id: string; message: string; status: string; toName: string }[];
  team: { value: string; label: string }[];
};

const STATUS_BADGE: Record<CriticalityStatus, string> = {
  OPEN: "bg-red-50 text-red-700 border-red-200",
  ACKNOWLEDGED: "bg-amber-50 text-amber-800 border-amber-200",
  IN_PROGRESS: "bg-sky-50 text-sky-800 border-sky-200",
  RESOLVED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  DISMISSED: "bg-slate-100 text-slate-500 border-slate-200",
};

export function CriticalityCard({ data }: { data: CriticalityCardData }) {
  const t = useTranslations("criticalities");
  const tEnums = useTranslations("enums");
  const tForms = useTranslations("forms");
  const tEntities = useTranslations("entities");
  const format = useFormatter();
  const [pending, startTransition] = useTransition();

  const transition = (status: CriticalityStatus) => {
    startTransition(async () => {
      const result = await setCriticalityStatus(data.id, status);
      if (result.ok) toast.success(tForms("saved"));
      else toast.error(tForms(`errors.${result.error}`));
    });
  };

  const isOpen = !["RESOLVED", "DISMISSED"].includes(data.status);

  return (
    <Card className={cn(data.severity === "CRITICAL" && isOpen && "border-red-300")}>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={SEVERITY_BADGE[data.severity]}>
              {tEnums(`Severity.${data.severity}`)}
            </Badge>
            <Badge variant="secondary">
              {tEnums(`CriticalityCategory.${data.category}`)}
            </Badge>
            <Badge variant="outline" className={STATUS_BADGE[data.status]}>
              {tEnums(`CriticalityStatus.${data.status}`)}
            </Badge>
            <Badge variant="outline">
              {tEnums(`CriticalitySource.${data.source}`)}
            </Badge>
            {data.finPosition ? (
              <Badge variant="outline">
                {tEnums(`FinPosition.${data.finPosition}`)}
              </Badge>
            ) : null}
          </div>
          <span className="text-xs text-muted-foreground">
            {format.dateTime(data.createdAt, {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div>
          <h3 className="font-semibold leading-snug">{data.title}</h3>
          <p className="text-xs text-muted-foreground">
            {data.projectCode} · {data.vesselName} · {data.locationName}
            {data.technicianName ? ` · ${data.technicianName}` : ""}
            {data.aiConfidence !== null
              ? ` · ${t("confidence")}: ${Math.round(data.aiConfidence * 100)}%`
              : ""}
          </p>
        </div>

        <p className="text-sm text-slate-700">{data.description}</p>

        {data.recommendedAction ? (
          <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
            <span className="font-medium">{t("recommendedAction")}: </span>
            {data.recommendedAction}
          </div>
        ) : null}

        {data.sourceExcerpt ? (
          <details className="text-sm">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              {t("sourceExcerpt")}
            </summary>
            <p className="mt-2 whitespace-pre-wrap rounded-lg border bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
              {data.sourceExcerpt}
            </p>
          </details>
        ) : null}

        {data.directives.length > 0 ? (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">
              {t("directives")}
            </div>
            {data.directives.map((directive) => (
              <div
                key={directive.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-2 text-xs"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">{directive.toName}:</span>{" "}
                  {directive.message}
                </span>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {tEnums(`DirectiveStatus.${directive.status}`)}
                </Badge>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5 border-t pt-3">
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {data.status === "OPEN" ? (
            <Button size="sm" variant="outline" onClick={() => transition("ACKNOWLEDGED")} disabled={pending}>
              <CircleDot className="size-3.5" aria-hidden /> {t("acknowledge")}
            </Button>
          ) : null}
          {isOpen && data.status !== "IN_PROGRESS" ? (
            <Button size="sm" variant="outline" onClick={() => transition("IN_PROGRESS")} disabled={pending}>
              {t("inProgress")}
            </Button>
          ) : null}
          {isOpen ? (
            <>
              <Button size="sm" variant="outline" onClick={() => transition("RESOLVED")} disabled={pending}>
                <Check className="size-3.5" aria-hidden /> {t("resolve")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => transition("DISMISSED")} disabled={pending}>
                <X className="size-3.5" aria-hidden /> {t("dismiss")}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => transition("OPEN")} disabled={pending}>
              <Undo2 className="size-3.5" aria-hidden /> {t("reopen")}
            </Button>
          )}

          <div className="ml-auto">
            <FormDialog
              title={t("sendDirective")}
              action={sendDirective}
              trigger={
                <Button size="sm">
                  <Send className="size-3.5" aria-hidden /> {t("sendDirective")}
                </Button>
              }
            >
              <input type="hidden" name="projectId" value={data.projectId} />
              <input type="hidden" name="criticalityId" value={data.id} />
              <SelectField
                name="toTechnicianId"
                label={tEntities("technician")}
                options={data.team}
                placeholder=""
                required
              />
              <div className="space-y-1.5">
                <Label htmlFor={`message-${data.id}`}>{t("directiveMessage")}</Label>
                <Textarea
                  id={`message-${data.id}`}
                  name="message"
                  rows={4}
                  required
                  defaultValue={data.recommendedAction ?? ""}
                />
              </div>
            </FormDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
