"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createProjectReport } from "@/server/actions/reports";

export function CreateReportButton({ projectId }: { projectId: string }) {
  const t = useTranslations("reports");
  const tForms = useTranslations("forms");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onCreate = () => {
    startTransition(async () => {
      const result = await createProjectReport(projectId);
      if (result.ok) {
        toast.success(t("creating"));
        router.refresh();
      } else {
        toast.error(tForms(`errors.${result.error}`));
      }
    });
  };

  return (
    <Card>
      <CardContent className="space-y-3 py-8 text-center">
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
        <Button onClick={onCreate} disabled={pending} size="lg">
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-4" aria-hidden />
          )}{" "}
          {t("create")}
        </Button>
      </CardContent>
    </Card>
  );
}
