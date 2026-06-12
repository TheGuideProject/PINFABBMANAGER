"use client";

import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("forms");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <TriangleAlert className="size-10 text-orange-500" aria-hidden />
      <p className="text-sm text-muted-foreground">{t("errors.genericError")}</p>
      <Button onClick={reset} variant="outline">
        ↻
      </Button>
    </main>
  );
}
