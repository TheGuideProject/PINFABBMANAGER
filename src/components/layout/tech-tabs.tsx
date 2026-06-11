"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Briefcase, MessageSquareWarning, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "jobs", href: "/tech", icon: Briefcase },
  { key: "directives", href: "/tech/directives", icon: MessageSquareWarning },
  { key: "profile", href: "/tech/profile", icon: UserRound },
] as const;

export function TechTabs() {
  const pathname = usePathname();
  const t = useTranslations("nav.tech");

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-md">
        {TABS.map(({ key, href, icon: Icon }) => {
          const active =
            href === "/tech" ? pathname === "/tech" : pathname.startsWith(href);
          return (
            <Link
              key={key}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                active ? "text-sky-600" : "text-slate-500",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {t(key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
