import { getTranslations } from "next-intl/server";
import { Anchor } from "lucide-react";
import { LoginForm } from "./login-form";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

export default async function LoginPage() {
  const t = await getTranslations("login");
  const tc = await getTranslations("common");

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-slate-950 px-4 py-10">
      <div className="absolute top-4 right-4">
        <LocaleSwitcher variant="dark" />
      </div>
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-400">
            <Anchor className="size-7" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {tc("appName")}
            </h1>
            <p className="mt-1 text-sm text-slate-400">{tc("tagline")}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur">
          <h2 className="text-lg font-medium text-white">{t("title")}</h2>
          <p className="mt-1 text-sm text-slate-400">{t("subtitle")}</p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
