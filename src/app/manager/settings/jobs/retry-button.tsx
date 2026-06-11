"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { retryJob } from "@/server/actions/jobs";

export function RetryJobButton({ jobId }: { jobId: string }) {
  const t = useTranslations("settings");
  const tForms = useTranslations("forms");
  const [pending, startTransition] = useTransition();

  const onRetry = () => {
    startTransition(async () => {
      const result = await retryJob(jobId);
      if (result.ok) toast.success(tForms("saved"));
      else toast.error(tForms(`errors.${result.error}`));
    });
  };

  return (
    <Button size="sm" variant="outline" onClick={onRetry} disabled={pending}>
      <RotateCcw className="size-3.5" aria-hidden /> {t("retry")}
    </Button>
  );
}
