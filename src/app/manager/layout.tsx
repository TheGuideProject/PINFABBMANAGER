import { Anchor } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { auth } from "@/server/auth";
import { ManagerNav } from "@/components/layout/manager-nav";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";

export default async function ManagerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const tc = await getTranslations("common");
  const user = session!.user;

  return (
    <div className="flex min-h-dvh w-full bg-slate-100">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950 lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
            <Anchor className="size-5" aria-hidden />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{tc("appName")}</div>
            <div className="text-[11px] text-slate-500">Operations</div>
          </div>
        </div>
        <ManagerNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Anchor className="size-5 text-sky-600" aria-hidden />
            <span className="text-sm font-semibold">{tc("appName")}</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <NotificationBell />
            <LocaleSwitcher />
            <UserMenu name={user.name ?? ""} email={user.email ?? ""} />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
