# Personal Toyota CRM

A single-user Toyota sales CRM built from the **Personal Toyota CRM.xlsx** workbook. It keeps the workbook's real prospects, financing applications, reservations, vehicle releases, lost sales, reference lists, vehicle models, and monthly targets, while replacing spreadsheets with a proper web app.

## What it does

- **Dashboard** — monthly sales, financing, and TFS targets; release progress; closing ratio; pending units; follow-ups; pipeline mix; lead-source and loss-reason rankings.
- **Prospects** — searchable, filterable list with full profiles, activity timeline, follow-up tracking, archive, and quick status changes.
- **Pipeline** — kanban board by pipeline status with drag-and-drop and optimistic updates.
- **Financing** — application tracker with bank, status, approval date, approved DP rate, release date, and status history written to the prospect timeline.
- **Reservations & Units** — reservation tracker with expected release dates, customer update cadence, and status history.
- **Vehicle Releases** — release log that drives sales targets and the closing ratio, with optional automatic updates to the prospect and reservation.
- **Lost Sales** — loss reasons, recoverable cases, recovery status, and quick recovery actions.
- **Reports** — six-month trend, release progress, lead-source performance, loss reasons, and Excel/CSV exports.
- **Settings** — profile, every workbook dropdown list, the full vehicle-model catalogue, monthly targets, import wizard, and exports.
- **Workbook import** — upload the original `.xlsx`, preview every mapping and warning, then commit idempotently.

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, minimal Radix primitives |
| Data/Auth | Supabase (Postgres, Auth, RLS) |
| Charts | Recharts |
| Validation | Zod |
| Spreadsheets | SheetJS (`xlsx`) |
| UI feedback | Sonner, lucide-react |

## Prerequisites

- Node.js 22+ and npm
- A Supabase project (free tier is enough)
- The original workbook at the repository root (`Personal Toyota CRM.xlsx`)

## Quick start

```bash
npm install
cp .env.example .env.local
# fill in the Supabase values (see below)
```

> **Branding asset:** place the approved Toyota logo file at `public/brand/toyota-logo.svg` (preferred) or `public/brand/toyota-logo.png`. The UI falls back to a generic car icon if the asset is missing; do not commit unapproved trademark assets.

### 1. Supabase setup

1. Create a project at https://supabase.com.
2. Open **SQL Editor** and review/run migrations **in order** as needed for the target environment:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_seed_lists.sql`
   - `supabase/migrations/0004_security_hardening.sql`
   - `supabase/migrations/0005_admin_full_access.sql` (**do not reapply blindly if already manually applied in production**; verify live schema/state first)
   - `supabase/migrations/0006_admin_user_avatar_and_reconciliation.sql` (additive reconciliation for admin/user role handling, invite/auth trigger compatibility, admin target policy reinforcement, and avatar Storage RLS policies)
3. In **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**server-only; never expose to browser/client bundles**). Required for admin account management and trusted avatar storage operations.
4. Supabase Storage:
   - Create a bucket named `profile-avatars` (recommended: **private**).
   - Apply/review Storage policies from `0006` (or equivalent manual policies) so users can manage only `avatars/<their-user-id>/...` and admins can manage avatar objects as needed.
   - The app stores avatar object paths in `profiles.avatar_url` and generates signed URLs server-side for display.
5. Set `NEXT_PUBLIC_SITE_URL` to the app URL (for local development, `http://localhost:3000`).
6. Authentication → Providers → Email: enable it. For the fastest local start, turn off **Confirm email** if appropriate for your environment. Admin-created accounts are confirmed server-side by the app when service-role access is configured.

### 2. Environment variables

See `.env.example`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_TIMEZONE=Asia/Manila
```

If Supabase variables are missing, the app redirects to `/setup`, which explains what to configure.

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000, create the account, then import the workbook.

## Migrating the workbook

### Recommended: in-app import

1. Sign in.
2. Go to **Settings → Data → Open import wizard** (or `/import`).
3. Upload the original `Personal Toyota CRM.xlsx`.
4. Review the summary and every warning/info issue.
5. Commit.

The import is idempotent through `legacy_key`:

- Prospects are matched by `pipeline:<row>`; derived prospects use `derived:<normalized name>`.
- Financing, reservations, releases, and lost sales use their worksheet row keys.
- Re-running the same workbook enriches existing prospects with contact details and skips records that already exist.
- Rows that cannot be matched create a derived prospect instead of being dropped, and an issue is raised for review.

### Convenience: SQL snapshot

The in-app import is the primary path. If you prefer SQL, generate a snapshot of the workbook:

```bash
npm run seed:generate
```

This writes `supabase/import-workbook-data.sql`. It attaches the records to the **first profile** in `public.profiles`, so create your account first, then run the file in the Supabase SQL editor. It is safe to re-run.

## Business rules implemented

These match the workbook's formulas:

- **Closing ratio** = units released ÷ prospects created in the period.
- **Financing releases** = releases whose transaction is `In-house financing` or `Financing`.
- **TFS releases** = releases whose bank is `TFS`.
- **Prospects created** use `leads.date_created`.
- **Applications submitted** use `financing_applications.date_submitted`.
- **Approvals** use `date_approval` (the written spec takes precedence over the workbook's approval column).
- **Pending units** use reservations whose status is `Pending Unit` in the period.
- **Remaining working days** use a Sunday-only weekend (`NETWORKDAYS.INTL` with `0000001`), in `Asia/Manila`.
- **Monthly targets** resolve to your personal target first, then the workbook/global target, then zero.

## Project structure

```text
app/
  (app)/                 authenticated shell and modules
    dashboard/ prospects/ pipeline/ financing/
    reservations/ releases/ lost-sales/ reports/ settings/ import/
  (auth)/                login and setup
  actions/               server actions (one file per domain)
  api/                   search and export routes
components/
  app/                   shell: sidebar, topbar, search, notifications
  dashboard/ finance/ …  feature forms and widgets
  shared/                page header, filters, pagination, stat cards
  ui/                    design-system primitives
lib/
  data/                  typed Supabase reads and aggregations
  import/                workbook parser, analyzer, committer
  supabase/              browser/server/admin clients and middleware
  auth.ts constants.ts dates.ts format.ts status.ts validation.ts
supabase/migrations/     schema, RLS, and real workbook reference data
scripts/generate-seed.ts workbook → SQL snapshot
types/database.ts        hand-written Database types (Supabase-compatible)
```

## Scripts

```bash
npm run dev          # local development
npm run build        # production build
npm run start        # production server
npm run typecheck    # TypeScript, no emit
npm run seed:generate
```

## Security

- Every CRM table has row-level security scoped to `owner_id = auth.uid()`.
- Dropdown options and vehicle models are shared reference data readable by authenticated users; personal additions stay scoped to their creator.
- Vehicle model maintenance is restricted to `owner` and `admin` profiles.
- Signup is invite-only after the first account bootstraps the workspace. Only CRM owners/admins can manage invitation rows in `public.signup_invites`; anonymous access is revoked.
- Profile roles cannot be changed or self-provisioned by non-admin users, and prospects cannot be hard-deleted by authenticated users.
- Customer records are protected by `ON DELETE RESTRICT`; archive prospects instead of deleting them.
- The service-role key is only imported in server-only code and scripts. Never expose it with a `NEXT_PUBLIC_` prefix.
- All mutations run through server actions that re-check the session and ownership.

## Deployment

1. Push the repository to GitHub.
2. Import it into Vercel (or any Node host).
3. Add the environment variables from `.env.example`.
4. Set `NEXT_PUBLIC_SITE_URL` to the deployed URL.
5. Add the deployed URL to Supabase **Authentication → URL Configuration** (Site URL and redirect URLs).
6. Apply the migrations to the production Supabase project and run the import once.

## Migration review notes

The import intentionally reports these workbook discrepancies instead of silently fixing them:

- `Mark Joseph Viray Robea` vs `Mark Joseph Robea`
- `Trixia Neadel Bedruz` vs `Trixia Neadel Gatdula Bedruz`
- `Vic Nelson Fullantes` vs `Vic Nelson Gueta Fullantes`
- `Levian Gatmaitan` vs `Levian Amaya Gatmaitan`
- Release model `TOYOTA ATIV 1.5 HEV CVT (PC)` vs the lead's `TOYOTA ATIV 1.5 HEV CVT`
- `CJ Evangelista` and `Wilfred De Guzman` have no pipeline match and become derived prospects
- `In-house financing` appears in the workbook's transaction column even though it is a sales channel; it is preserved verbatim in `transaction` and also stored in `sales_channel`
- Financing bank is inferred from remarks where the sheet omits it (for example TFS or BPI), and an info issue records the inference

Review these in the import preview before committing.

## Troubleshooting

- **Redirected to `/setup`** — Supabase env vars are missing or empty.
- **Signup succeeds but sign-in fails** — disable email confirmation in Supabase Auth, or confirm the email first.
- **`npm install` times out** — the registry is slow; retry with `npm install --prefer-offline --fetch-timeout=600000 --fetch-retries=5`.
- **Import finds zero rows** — confirm you uploaded `.xlsx` (not a renamed `.csv`) and that the worksheet names match the original workbook.
- **A prospect should not disappear** — use **Archive** in the prospect list instead of deleting. Archived prospects keep their financing, reservation, release, and lost-sale history.
