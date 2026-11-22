# Clinic scheduling

## Development

Run `npm ci` and `npm run dev`. The React and Tailwind site uses Vite. `npm run build` builds both the clinic site and the staff dashboard. `npm run build:demo` explicitly builds a browser-only demo.

Copy `.env.example` to `.env` if you need a starter file. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for a real build. Vite exposes these two settings to the browser. Keep the PostgreSQL connection string and other privileged credentials out of Vite-prefixed settings. Git ignores local environment files.

## Database setup

1. Apply the files in `supabase/migrations` in timestamp order. For a linked Supabase CLI project, review `npx supabase db push --dry-run`, then run `npx supabase db push` to apply outstanding versions once. Alternatively, apply the SQL in the Supabase SQL Editor, keeping the migration history aligned if you also use the CLI.
2. Create staff accounts in Supabase Auth using email and password. Add each authorized user with `insert into clinic_private.staff (user_id) values ('<auth-user-uuid>');` in the SQL Editor.
3. Build with the configured environment and sign in at `/admin.html`. Enable confirmed clinic hours, set durations, and review the sample services. The initial migration keeps all weekdays closed.
4. Verify guest appointment requests, staff access, and appointment updates in the connected project. Configure abuse protection before accepting public requests. Staff contact patients directly when confirming or changing an appointment.

## Database revisions

The application uses five tables under `clinic_private`: staff, services, hours, blocks, and appointments. Use a new timestamped migration for each change. Keep deployed migration files intact and use the Supabase migration ledger to prevent replay. Alter existing tables in place when possible. If a revision truly replaces a table, backfill and verify the replacement, then retire the obsolete table in a reviewed follow-up migration. Inspect the target project before touching any unrelated objects.

Requests carry an idempotency UUID. A unique index also rejects equivalent active requests issued with different UUIDs. If the index migration detects existing duplicates, it rolls back without deleting history. Review and reconcile those appointments before retrying. Confirmation and rescheduling recheck availability, and PostgreSQL enforces non-overlapping confirmed appointments on the single clinic calendar.

The dashboard adapts the chart feedback and navigation patterns from Ruixen UI's Spark Chart and Nested Dashboard Menu.
