"use client";

import { useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import type { ActionResult } from "@/server/actions/action-result";

export function ConfirmDelete({
  trigger,
  description,
  action,
}: {
  trigger: ReactNode;
  description?: string;
  action: () => Promise<ActionResult>;
}) {
  const [pending, startTransition] = useTransition();
  const t = useTranslations("forms");

  const onConfirm = () => {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(t("deleted"));
      else toast.error(t(`errors.${result.error}`));
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? t("deleteConfirmBody")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={pending}
            className="bg-red-600 hover:bg-red-500"
          >
            {t("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
