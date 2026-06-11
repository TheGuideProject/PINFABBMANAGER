import { Anchor } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { auth } from "@/server/auth";
import { TechTabs } from "@/components/layout/tech-tabs";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { UserMenu } from "@/components/layout/user-menu";

export default async function TechLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const tc = await getTranslations("common");
  const user = session!.user;

  return (
    <div className="flex min-h-dvh flex-col bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Anchor className="size-5 text-sky-600" aria-hidden />
            <span className="text-sm font-semibold">{tc("appName")}</span>
          </div>
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <UserMenu name={user.name ?? ""} email={user.email ?? ""} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-24 pt-4">
        {children}
      </main>
      <TechTabs />
    </div>
  );
}
