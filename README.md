# PINFAB Manager

Management platform for international fin stabilizer operations: projects, vessels,
technicians, daily field reports, AI-driven criticality detection and signed service
reports. Manager back-office (desktop) + technician PWA (mobile).

**Stack**: Next.js (App Router, TS) · PostgreSQL + Prisma · Auth.js v5 · next-intl (IT/EN) ·
shadcn/ui + Tailwind · deployed on Railway.

## Local development

```bash
npm install                 # also runs prisma generate
cp .env.example .env        # set DATABASE_URL + AUTH_SECRET
npx prisma migrate dev      # apply migrations
npx prisma db seed          # demo data
npm run dev
```

### Demo accounts (seed)

| Role       | Email                      | Password    |
| ---------- | -------------------------- | ----------- |
| Admin      | `admin@pinfab.it`          | `Admin123!` |
| Manager    | `manager@pinfab.it`        | `Manager123!` |
| Technician | `marco.rossi@pinfab.it`    | `Tech123!`  |
| Technician | `luca.bianchi@pinfab.it`   | `Tech123!`  |
| Technician | `andrei.popescu@pinfab.it` | `Tech123!`  |

Managers land on `/manager` (desktop dashboard), technicians on `/tech` (mobile PWA,
installable via "Add to Home Screen").

## Deploy on Railway

1. Create a Railway project, add a **PostgreSQL** service.
2. Add a service from this repo — the `Dockerfile` + `railway.json` are picked up
   automatically (healthcheck on `/api/health`, migrations run on boot).
3. Set service variables:
   - `DATABASE_URL` → reference the Postgres service variable
   - `AUTH_SECRET` → `openssl rand -base64 32`
   - `AUTH_TRUST_HOST=true`
   - `NEXT_PUBLIC_APP_URL` → the public Railway URL
4. First deploy, then seed once: `railway run npx prisma db seed`

Storage (R2) and AI keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) are introduced in
later phases — see `.env.example`.

## Project structure

```
prisma/                  schema (full domain model), migrations, seed
messages/                it.json / en.json translations
src/proxy.ts             auth + role routing (Next 16 proxy)
src/server/auth.ts       Auth.js v5 config + requireRole()
src/server/db.ts         Prisma client (driver adapter)
src/server/actions/      server actions (mutations)
src/app/manager/**       manager back-office (MANAGER/ADMIN)
src/app/tech/**          technician PWA (TECHNICIAN)
src/components/          ui (shadcn), layout
```

## Roadmap (phases)

1. ✅ Foundation: auth, roles, i18n, dashboards, PWA shell, Railway deploy
2. Management CRUD, world map (Leaflet), planning calendar
3. Technician flows: daily logs, measurements, photo upload (R2 storage)
4. AI pipeline: daily-log analysis, meeting transcription + analysis, criticality
   center, directives, notifications (Claude API + Whisper)
5. Report templates, AI report generation, signatures, PDF, archive
6. Analytics: technician performance, client patterns
