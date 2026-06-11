import type { DefaultSession } from "next-auth";
import type { Role, Locale } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      locale: Locale;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    locale: Locale;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: Role;
    locale?: Locale;
  }
}
