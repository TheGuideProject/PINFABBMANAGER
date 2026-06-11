"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const POLL_MS = 30_000;

export function NotificationBell() {
  const t = useTranslations("common");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as {
        items: NotificationItem[];
        unread: number;
      };
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      // Polling failure is non-fatal.
    }
  }, []);

  useEffect(() => {
    // setState only happens inside fetch callbacks (async), never sync in the effect.
    const initial = setTimeout(() => void load(), 0);
    const interval = setInterval(() => void load(), POLL_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [load]);

  const onOpenChange = (open: boolean) => {
    if (open && unread > 0) {
      fetch("/api/notifications", { method: "POST" }).then(() => {
        setUnread(0);
      });
    }
  };

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t("notifications")}
        >
          <Bell className="size-4.5" aria-hidden />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>{t("notifications")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            —
          </div>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={item.id} asChild>
              <Link
                href={item.link ?? "#"}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5",
                  !item.readAt && "bg-sky-50",
                )}
              >
                <span className="text-sm font-medium leading-snug">
                  {item.title}
                </span>
                {item.body ? (
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {item.body}
                  </span>
                ) : null}
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
