# FERA — PHASE 1 BUILD INSTRUCTIONS

You are building Phase 1 of a web application called Fera. Follow this spec exactly. Do not add features, screens, or logic beyond what is listed here. Where a value is marked "placeholder," implement it as a named, easily-editable constant, not a hardcoded literal buried in logic.

## Scope

Build, in this order: waitlist signup → admin waitlist release → intake questionnaire → snapshot results → account creation + payment → plan generation → plan pending confirmation.

Do NOT build: doctor review dashboard, video call booking, daily home screen, cycle tracking, symptom check-ins, supplement purchase/commerce, any native iOS/Android app or app-store submission. (The PWA requirements below make the web app installable to a home screen — this is not the same as a native app and does not involve app store review.)

## Tech Stack

- Frontend: Next.js (App Router) + Tailwind CSS
- Backend/DB: Supabase (Postgres, Auth, Storage, Row Level Security)
- Hosting: Vercel
- Payments: Razorpay (Subscriptions API)
- Delivery: Progressive Web App (PWA) — installable to a phone's home screen directly from the browser, no app store submission

## Setup Steps (do first, in order)

1. Initialize a Next.js project with the App Router and Tailwind CSS.
2. Install and configure the Supabase client library. Expect environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Install and configure the Razorpay SDK. Expect environment variables: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
4. Set up a `.env.local` template listing all required environment variables with placeholder values.
5. Configure the project as an installable PWA (see PWA Requirements section below) as part of initial setup, not as a later addition.

## PWA Requirements

Implement these from the start so the app is installable to a phone's home screen directly from the browser:

- Add a `manifest.json` (or Next.js's built-in `app/manifest.ts`) defining: app name ("Fera"), short name, theme color and background color (from the brand palette), icons (at minimum 192x192 and 512x512 px, both maskable and standard variants), `display: "standalone"` (so it opens without browser chrome/address bar), and `start_url`.
- Add a service worker for basic asset caching so the app shell loads reliably on repeat visits. Use `next-pwa` or an equivalent standard Next.js PWA plugin rather than hand-rolling service worker logic — do not implement custom offline data sync or background sync in this phase, only static asset caching.
- Ensure the site is served over HTTPS (Vercel does this by default) — required for PWA installability.
- Do not implement native push notifications via the service worker in this phase — that is a later-phase decision, not Phase 1.
- Test that "Add to Home Screen" (Android/Chrome) and "Add to Home Screen" (iOS/Safari) both work and that the installed icon opens the app in standalone mode, not inside a visible browser tab.

## Data Model

Create the following Postgres tables in Supabase, with Row Level Security enabled on all of them.

### `users`
- `id` uuid, primary key, FK to `auth.users`
- `full_name` text
- `phone` text
- `email` text
- `subscription_status` enum: `none`, `pending_payment`, `active`, `cancelled` — default `none`
- `billing_cycle` enum: `monthly`, `quarterly`, `yearly`, nullable
- `created_at` timestamp, default now()

RLS: a user can select/update only the row where `id = auth.uid()`.

### `waitlist_entries`
- `id` uuid, primary key, default gen_random_uuid()
- `name` text
- `email` text
- `phone` text
- `status` enum: `waiting`, `released`, `expired` — default `waiting`
- `created_at` timestamp, default now()
- `released_at` timestamp, nullable

RLS: public INSERT allowed. SELECT/UPDATE restricted to admin role only (see Admin section below).

### `intake_responses`
- `id` uuid, primary key, default gen_random_uuid()
- `waitlist_entry_id` uuid, FK to `waitlist_entries.id`
- `user_id` uuid, FK to `users.id`, nullable (filled in after account creation)
- `diagnosis_status` enum: `diagnosed`, `suspected`, `has_recent_labs`
- `cycle_pattern` text
- `top_symptoms` jsonb (array, max 5 entries)
- `lifestyle_snapshot` jsonb
- `primary_goal` text
- `existing_investigations` jsonb (object with boolean per category: `blood_work`, `hormone_panel`, `ultrasound`, `other`)
- `created_at` timestamp, default now()

RLS: insert allowed if the row's `waitlist_entry_id` matches a valid released entry (checked at API layer, not just RLS). A user can select their own row once `user_id` is set. Admin role can select all.

### `snapshots`
- `id` uuid, primary key, default gen_random_uuid()
- `intake_response_id` uuid, FK to `intake_responses.id`
- `pain_points` jsonb (array of `{ area: string, summary_text: string }`)
- `created_at` timestamp, default now()

RLS: readable by the user linked via `intake_response_id` → `user_id`, and by admin.

### `plans`
- `id` uuid, primary key, default gen_random_uuid()
- `user_id` uuid, FK to `users.id`
- `generated_from_intake_id` uuid, FK to `intake_responses.id`
- `steps_target` integer
- `water_target_l` numeric
- `protein_target_g` integer
- `fiber_target_g` integer
- `movement_guidance` text
- `supplement_regimen` jsonb (array of `{ name: string, dose: string, timing: string }`)
- `status` enum: `pending_review`, `approved`, `active` — default `pending_review`
- `doctor_notes` text, nullable
- `created_at` timestamp, default now()
- `approved_at` timestamp, nullable

RLS: user can SELECT their own row. Only the service role (server-side) can INSERT/UPDATE — a user must never be able to write to this table directly, including their own row.

### `subscriptions`
- `id` uuid, primary key, default gen_random_uuid()
- `user_id` uuid, FK to `users.id`
- `razorpay_subscription_id` text
- `plan_tier` enum: `monthly`, `quarterly`, `yearly`
- `price_paid` numeric
- `status` enum: `created`, `active`, `past_due`, `cancelled`
- `current_period_end` timestamp
- `created_at` timestamp, default now()

RLS: user can SELECT their own row. Only service role can INSERT/UPDATE (written only via the Razorpay webhook handler).

## Screens

### 1. `/` — Landing / Waitlist Signup
Public. Form fields: name, email, phone. On submit, call `POST /api/waitlist`, which inserts a row into `waitlist_entries` with `status = waiting`. Show a confirmation message on success. No login, no payment on this screen.

### 2. `/admin/waitlist` — Admin Waitlist Release
Protected route. Use a single hardcoded admin credential check for Phase 1 (env var `ADMIN_PASSWORD`), not a full role system. Table view of all `waitlist_entries`, ordered by `created_at` ascending. Each row has a "Release" button that: sets `status = released`, `released_at = now()`, and sends an email (use a basic transactional email provider — Resend or similar) containing a signup link in the form `/intake?wid={waitlist_entry_id}`. No design polish required — functional only.

### 3. `/intake` — Intake Questionnaire
Accessed only via a link containing a valid `wid` query param pointing to a `released` waitlist entry (reject/redirect if the entry is not `released` or does not exist). Multi-step form, in this exact order:

1. Diagnosis status — radio: "I have a PCOS diagnosis" / "I suspect I have PCOS" / "Not sure"
2. Cycle pattern — plain-language options (e.g., "Regular, about every month" / "Irregular" / "Rare or absent periods"), not a numeric cycle-length input
3. Top symptoms — checkbox list, enforce a max of 5 selections, from a fixed list (irregular periods, absent periods, acne, scalp hair loss, hair thinning, unwanted facial/body hair, weight gain, difficulty losing weight, fatigue, cravings, bloating, mood changes)
4. Lifestyle snapshot — a small number of questions covering activity level, sleep, stress, diet pattern
5. Primary goal — single select (regulate periods, lose weight, reduce waist circumference, improve hair growth, reduce hair loss, reduce unwanted hair, improve acne, improve energy, improve fertility, improve metabolic health)
6. Existing investigations — yes/no checklist per category: blood work, hormone panel, ultrasound, other (status only — do not build file upload in Phase 1)

Progress indicator: a journey-path style indicator with labeled steps (Cycle → Symptoms → Lifestyle → Goals → Reports), not "Question X of Y" and not a percentage bar.

On completion, call `POST /api/intake` to save the response, then redirect to `/snapshot/{intake_response_id}`.

### 4. `/snapshot/[intake_id]` — Snapshot Results
Calls `GET /api/snapshot/:intake_id`. If a snapshot doesn't yet exist for this intake response, generate one server-side using the rules-based function described below, save it, and return it. Display 2–3 "areas that may need attention" in plain, non-alarming language. Do NOT display any numeric score. End with a CTA button: "Create your account to unlock your personalized plan" linking to `/signup?intake_id={intake_response_id}`.

**Snapshot generation logic (deterministic, rules-based — not an LLM call):** Write a function that maps combinations of `diagnosis_status`, `top_symptoms`, and `lifestyle_snapshot` answers to a small fixed set of pain-point templates (e.g., if `top_symptoms` includes irregular/absent periods → include a "Menstrual Health" pain point; if it includes acne + weight gain + difficulty losing weight → include a "Metabolic Health" pain point; if it includes hair loss/hirsutism → include a "Hormonal Balance" pain point). Each pain point returns `{ area, summary_text }` using pre-written, non-alarming template text — never generate free text claiming a diagnosis.

### 5. `/signup` — Account Creation + Payment
Form: email, password, full name, phone. On submit, create the Supabase Auth user, insert/update the corresponding `users` row, and link `intake_responses.user_id` to the new user via the `intake_id` query param.

After account creation, show billing cycle selection: Monthly (₹2,999/mo), Quarterly (₹2,499/mo, billed quarterly), Yearly (₹2,000/mo, billed yearly). On selection, call `POST /api/razorpay/create-subscription` to initiate Razorpay Subscriptions checkout.

### 6. `/api/razorpay/webhook` (not a UI screen)
Verify the Razorpay webhook signature. On a successful payment event: insert a `subscriptions` row, update `users.subscription_status = active` and `users.billing_cycle`, then call the plan generation function (`POST /api/plan/generate` internally) using the user's linked `intake_responses` row.

**Plan generation logic (deterministic, rules-based):** Generate `steps_target`, `water_target_l`, `protein_target_g`, `fiber_target_g`, `movement_guidance`, and `supplement_regimen` from the intake data using named constants (e.g., `DEFAULT_PROTEIN_TARGET_G`, `STEPS_TARGET_BY_ACTIVITY_LEVEL`), not inline magic numbers. These constants are explicitly placeholders pending clinician review — implement them as a single, clearly-commented config object so they can be edited in one place later. Insert the result into `plans` with `status = pending_review`.

### 7. `/plan-pending` — Plan Pending Confirmation
Final screen. Message: "Your plan is ready and pending review. You'll be contacted to schedule your Day-1 walkthrough call." No booking widget, no calendar — that is Phase 2.

## API Routes

- `POST /api/waitlist`
- `GET /api/admin/waitlist`, `POST /api/admin/waitlist/release` (admin-protected)
- `POST /api/intake`
- `GET /api/snapshot/:intake_id`
- `POST /api/auth/signup`
- `POST /api/razorpay/create-subscription`
- `POST /api/razorpay/webhook`
- `POST /api/plan/generate` (internal only — must not be callable directly by a client; call it only from the webhook handler)

## Explicit Constraints

- Do not implement phone/OTP auth — email/password only.
- Do not implement file upload for investigations/reports in this phase — status checkboxes only.
- Do not implement any numeric "score" on the snapshot screen.
- Do not allow a user's own client to write to the `plans` or `subscriptions` tables — all writes to those tables happen server-side via the service role key.
- Do not build a calendar/video booking flow, a home dashboard, or any tracking screens — these are out of scope for this phase.
- Build the frontend so it remains compatible with static export and Capacitor packaging later (for a possible future native iOS/Android wrapper). Concretely: keep page-level data fetching client-side (using the Supabase client SDK in the browser) rather than relying on Next.js server components or server-only rendering for core screens; keep all backend logic (payment webhooks, plan generation, admin actions) in API routes that are called over the network, not embedded in server-rendered page logic. This does not block anything in Phase 1 — it is a "how to write it" constraint, not a feature to build.
