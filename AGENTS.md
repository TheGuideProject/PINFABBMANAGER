<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PINFABB Manager — project notes

- Stack: Next.js 16 (App Router, Turbopack), Prisma 7 (driver adapter `@prisma/adapter-pg`,
  client generated to `src/generated/prisma` — import from `@/generated/prisma/client`),
  Auth.js v5 (JWT, Credentials), next-intl v4 (cookie-based locale, no URL segment),
  shadcn/ui + Tailwind v4.
- `src/proxy.ts` (Next 16 name for middleware) handles auth/role routing; it must stay
  Prisma-free — it builds NextAuth from `src/server/auth.config.ts` only.
- Every Server Action must call `requireRole()` from `src/server/auth.ts`.
- Commands: `npm run dev` · `npm run build` · `npm run lint` ·
  `npx prisma migrate dev` · `npx prisma db seed`.
- Local Postgres for dev: see DATABASE_URL in `.env` (a throwaway cluster works:
  `initdb` + `pg_ctl start` + `createdb pinfabb`).
- Translations live in `messages/it.json` / `messages/en.json` — every user-facing
  string needs both.
