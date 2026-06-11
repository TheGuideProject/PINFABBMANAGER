"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Map,
  FolderKanban,
  Ship,
  Building2,
  Users,
  CalendarDays,
  AlertTriangle,
  FileText,
  BarChart3,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Items past Phase 1 stay visible but disabled, so the full product scope
// is already readable in the sidebar during the demo.
const ITEMS = [
  { key: "dashboard", href: "/manager", icon: LayoutDashboard, ready: true },
  { key: "map", href: "/manager/map", icon: Map, ready: true },
  { key: "projects", href: "/manager/projects", icon: FolderKanban, ready: true },
  { key: "vessels", href: "/manager/vessels", icon: Ship, ready: true },
  { key: "clients", href: "/manager/clients", icon: Building2, ready: true },
  { key: "technicians", href: "/manager/technicians", icon: Users, ready: true },
  { key: "planning", href: "/manager/planning", icon: CalendarDays, ready: true },
  { key: "criticalities", href: "/manager/criticalities", icon: AlertTriangle, ready: true },
  { key: "reports", href: "/manager/reports", icon: FileText, ready: false },
  { key: "analytics", href: "/manager/analytics", icon: BarChart3, ready: false },
  { key: "settings", href: "/manager/settings", icon: Settings, ready: true },
] as const;

export function ManagerNav() {
  const pathname = usePathname();
  const t = useTranslations("nav.manager");
  const tc = useTranslations("common");

  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Main">
      {ITEMS.map(({ key, href, icon: Icon, ready }) => {
        const active =
          href === "/manager" ? pathname === "/manager" : pathname.startsWith(href);

        if (!ready) {
          return (
            <span
              key={key}
              aria-disabled
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500"
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="flex-1">{t(key)}</span>
              <Badge
                variant="outline"
                className="border-slate-700 text-[10px] text-slate-500"
              >
                {tc("comingSoon")}
              </Badge>
            </span>
          );
        }

        return (
          <Link
            key={key}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sky-500/15 font-medium text-sky-300"
                : "text-slate-300 hover:bg-slate-800 hover:text-white",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
