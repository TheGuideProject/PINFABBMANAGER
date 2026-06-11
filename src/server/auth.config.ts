import type { NextAuthConfig } from "next-auth";
import type { Role, Locale } from "@/generated/prisma/enums";

// Edge/proxy-safe config: no Prisma, no bcrypt. The Credentials provider with
// its DB-backed authorize lives in src/server/auth.ts; src/proxy.ts builds a
// JWT-only NextAuth instance from this shared config.
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.locale = user.locale;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = token.role as Role;
      session.user.locale = token.locale as Locale;
      return session;
    },
  },
} satisfies NextAuthConfig;
