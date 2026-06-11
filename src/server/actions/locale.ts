"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import {
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
  type AppLocale,
} from "@/i18n/request";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setLocale(locale: string) {
  if (!SUPPORTED_LOCALES.includes(locale as AppLocale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { maxAge: ONE_YEAR, path: "/" });

  const session = await auth();
  if (session?.user?.id) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { locale: locale as AppLocale },
    });
  }

  revalidatePath("/", "layout");
}
