"use server";

import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/server/auth";
import { prisma } from "@/server/db";
import { LOCALE_COOKIE } from "@/i18n/request";

export type LoginState = { error?: "invalidCredentials" | "genericError" };

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          error.type === "CredentialsSignin"
            ? "invalidCredentials"
            : "genericError",
      };
    }
    throw error;
  }

  // Align the UI language with the user's stored preference right away.
  const user = await prisma.user.findUnique({
    where: { email },
    select: { locale: true },
  });
  if (user) {
    const store = await cookies();
    store.set(LOCALE_COOKIE, user.locale, { maxAge: ONE_YEAR, path: "/" });
  }

  redirect("/");
}

export async function logoutAction() {
  await signOut({ redirect: false });
  redirect("/login");
}
