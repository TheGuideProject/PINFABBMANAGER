"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction, type LoginState } from "@/server/actions/login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const t = useTranslations("login");
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-300">
          {t("email")}
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="name@pinfabb.it"
          className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-600"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-300">
          {t("password")}
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="border-slate-700 bg-slate-950 text-white"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-400">
          {t(state.error)}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-sky-500 text-white hover:bg-sky-400"
      >
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
