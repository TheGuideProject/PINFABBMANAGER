"use client";

import { useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { acknowledgeDirective } from "@/server/actions/criticalities";

export type DirectiveItem = {
  id: string;
  message: string;
  status: string;
  createdAt: Date;
  fromName: string;
  projectCode: string;
  criticalityTitle: string | null;
};

export function DirectiveList({ directives }: { directives: DirectiveItem[] }) {
  const t = useTranslations("directives");
  const tEnums = useTranslations("enums");
  const tForms = useTranslations("forms");
  const format = useFormatter();
  const [pending, startTransition] = useTransition();

  const acknowledge = (id: string) => {
    startTransition(async () => {
      const result = await acknowledgeDirective(id);
      if (result.ok) toast.success(t("acknowledged"));
      else toast.error(tForms(`errors.${result.error}`));
    });
  };

  return (
    <div className="space-y-3">
      {directives.map((directive) => {
        const needsAck = directive.status === "SENT" || directive.status === "READ";
        return (
          <Card key={directive.id}>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {directive.projectCode}
                  </span>{" "}
                  · {t("from", { name: directive.fromName })} ·{" "}
                  {format.dateTime(directive.createdAt, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {tEnums(`DirectiveStatus.${directive.status}`)}
                </Badge>
              </div>

              {directive.criticalityTitle ? (
                <div className="rounded-md bg-orange-50 px-3 py-2 text-xs text-orange-900">
                  {t("relatedTo")}: {directive.criticalityTitle}
                </div>
              ) : null}

              <p className="whitespace-pre-wrap text-sm">{directive.message}</p>

              {needsAck ? (
                <Button
                  onClick={() => acknowledge(directive.id)}
                  disabled={pending}
                  className="w-full"
                >
                  <CheckCheck className="size-4" aria-hidden /> {t("acknowledge")}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
