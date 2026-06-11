"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { setLocale } from "@/server/actions/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ variant }: { variant?: "dark" | "light" }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const [pending, startTransition] = useTransition();

  const change = (next: string) => {
    if (next === locale) return;
    startTransition(() => setLocale(next));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          className={cn(
            "gap-1.5",
            variant === "dark" && "text-slate-300 hover:bg-slate-800 hover:text-white",
          )}
          aria-label={t("language")}
        >
          <Languages className="size-4" aria-hidden />
          <span className="text-xs font-semibold uppercase">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => change("it")} disabled={locale === "it"}>
          🇮🇹 {t("italian")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => change("en")} disabled={locale === "en"}>
          🇬🇧 {t("english")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
