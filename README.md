# Fera — Phase 1

Waitlist signup, admin release, intake, snapshot, account + Razorpay subscription, and rules-based plan generation. Installable as a PWA.

## Stack

- Next.js App Router + Tailwind CSS
- Supabase (Postgres, Auth, RLS)
- Razorpay Subscriptions
- Resend
- Serwist (PWA asset caching)

Requires Node 20+.

## Setup

1. Create a Supabase project. In the SQL editor, run `supabase/migrations/001_initial_schema.sql`.
2. Create Razorpay subscription plans for monthly (₹2,999), quarterly (₹7,497), and yearly (₹24,000). Copy the plan IDs into env.
3. Create a Resend API key and a from-address.
4. Copy `.env.example` to `.env.local` and fill in every value.
5. Install and run:

```bash
npm install
npm run generate-icons
npm run dev
```

## Routes

- `/` waitlist signup
- `/admin/waitlist` release a waitlist entry (uses `ADMIN_PASSWORD`)
- `/intake?wid={waitlist_entry_id}` intake questionnaire
- `/snapshot/{intake_id}` snapshot results
- `/signup?intake_id={intake_id}` account + payment
- `/plan-pending` confirmation after checkout

Point the Razorpay webhook at `/api/razorpay/webhook` and use the same secret as `RAZORPAY_WEBHOOK_SECRET`.

Plan targets and supplement placeholders live in `src/lib/plan-config.ts` and are pending clinician review.

## Deploy

Host on Vercel. Set the same environment variables there. HTTPS is required for PWA install (Add to Home Screen on Android/Chrome and iOS/Safari).
