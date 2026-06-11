"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { saveLogDetails, submitDailyLog } from "@/server/actions/daily-logs";

export function LogDetailsForm({
  logId,
  notes,
  workHours,
}: {
  logId: string;
  notes: string | null;
  workHours: number | null;
}) {
  const t = useTranslations("techJobs");
  const tForms = useTranslations("forms");
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveLogDetails(logId, formData);
      if (result.ok) toast.success(tForms("saved"));
      else toast.error(tForms(`errors.${result.error}`));
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={notes ?? ""}
          rows={5}
          placeholder="Work done, issues found, remarks for the office…"
        />
      </div>
      <div className="flex items-end gap-3">
        <div className="w-32 space-y-1.5">
          <Label htmlFor="workHours">{t("workHours")}</Label>
          <Input
            id="workHours"
            name="workHours"
            type="number"
            step="0.5"
            min={0}
            max={24}
            inputMode="decimal"
            defaultValue={workHours ?? ""}
          />
        </div>
        <Button type="submit" disabled={pending} variant="outline">
          {pending ? tForms("saving") : t("saveDetails")}
        </Button>
      </div>
    </form>
  );
}

export function SubmitLogButton({ logId }: { logId: string }) {
  const t = useTranslations("techJobs");
  const tForms = useTranslations("forms");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      const result = await submitDailyLog(logId);
      if (result.ok) {
        toast.success(t("submittedBadge"));
        router.refresh();
      } else {
        toast.error(tForms(`errors.${result.error}`));
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="w-full" size="lg" disabled={pending}>
          <Send className="size-4" aria-hidden /> {t("submitLog")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("submitConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("submitConfirmBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{tForms("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
            {t("submitLog")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
