import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/server/db";
import { authConfig } from "@/server/auth.config";
import type { Role } from "@/generated/prisma/enums";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          locale: user.locale,
        };
      },
    }),
  ],
});

/**
 * Server-side authorization boundary for Server Actions and route handlers.
 * Proxy-level redirects are convenience only — every mutation must call this.
 */
export async function requireRole(...roles: Role[]) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  if (roles.length > 0 && !roles.includes(session.user.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
