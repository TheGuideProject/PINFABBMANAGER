"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Anchor, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ManagerNav } from "@/components/layout/manager-nav";

export function ManagerMobileNav() {
  const pathname = usePathname();
  const tc = useTranslations("common");

  return (
    // key={pathname}: the sheet remounts closed after each navigation,
    // so tapping a menu item dismisses the drawer without effects.
    <Sheet key={pathname}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Menu"
        >
          <Menu className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 border-slate-800 bg-slate-950 p-0 text-white [&>button]:text-slate-400"
      >
        <SheetHeader className="px-5 pb-0 pt-5">
          <SheetTitle className="flex items-center gap-2.5 text-white">
            <span className="flex size-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
              <Anchor className="size-5" aria-hidden />
            </span>
            {tc("appName")}
          </SheetTitle>
        </SheetHeader>
        <ManagerNav />
      </SheetContent>
    </Sheet>
  );
}
