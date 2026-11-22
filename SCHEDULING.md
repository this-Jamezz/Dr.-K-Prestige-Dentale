# Clinic scheduling

The site runs in demo mode while both entries in `dist/clinic-config.js` are empty. Demo requests share the browser's demo schedule with `/admin.html`. The demo saves a fixed sample name and email in place of visitor input.

## Connect Supabase

1. Apply the migration in `supabase/migrations` to the intended Supabase project.
2. Invite the doctor and other authorized staff using Supabase Auth. This dashboard uses email and password. Provision the accounts and their passwords through Supabase Auth before launch. Add each authorized user's Auth UUID through the SQL editor with `insert into clinic_private.staff (user_id) values ('<auth-user-uuid>');`
3. Set the project URL and **publishable** key in `dist/clinic-config.js`. Never put a secret or service-role key in the frontend.
4. Sign in to `/admin.html`, enable confirmed clinic hours, set service durations, and review sample service names. The migration starts with booking closed on all seven days.
5. Verify guest availability and submission, staff access, and appointment updates in that project. Before public launch, configure abuse protection for anonymous requests. Staff contact patients directly when confirming or changing an appointment.

Pending requests do not reserve time. Confirmation and rescheduling recheck availability. PostgreSQL enforces non-overlapping confirmed bookings on a single clinic calendar. Staff use one role for this version.

The staff dashboard adapts the chart feedback and compact navigation patterns from Ruixen UI's Spark Chart and Nested Dashboard Menu for this site's static HTML, CSS, and JavaScript.
