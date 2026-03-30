# Golf Charity Platform v1 Architecture

## Product Scope
This v1 implements the PRD core flows:
- Public discovery and charity browsing
- Subscriber signup, login, subscription purchase, and renewal lifecycle
- Golf score entry with latest-5 retention
- Monthly draw execution with random or weighted mode
- Prize pool allocation with jackpot rollover
- Winner proof verification and payout tracking
- Admin operations across users, draws, charities, and reports

## System Topology
- Frontend: Next.js App Router (TypeScript) deployed on Vercel
- Backend API: Express + TypeScript deployed on Render
- Auth, database, storage: Supabase
- Payments: Razorpay subscriptions + webhooks
- Email events: Resend (or equivalent)
- Hosting split: Vercel (frontend) + Render (backend)

## Domain Modules
- Auth and Roles
- Subscription and Billing
- Scores
- Draw Engine
- Prize Accounting
- Charity
- Winner Verification
- Reporting
- Notifications

## Role Matrix
- Visitor: browse pages, view charities, start signup
- Subscriber: manage profile, scores, charity %, participation, winnings
- Admin: manage users/subscriptions, draw config and publish, charity CRUD, verification, payouts, analytics

## Data Model Summary
Primary entities:
- profiles
- subscriptions
- charities
- user_charity_preferences
- score_entries
- draws
- draw_winners
- winner_verifications
- payout_transactions
- prize_pool_ledger

## Critical Business Rules
- Score value must be 1 to 45
- Only latest 5 scores per user are retained
- Draw tiers: 5-match, 4-match, 3-match
- Prize split: 40% (5-match), 35% (4-match), 25% (3-match)
- 5-match can rollover when no winner
- Charity contribution must be >= 10% of subscription fee
- Subscription status validated on each authenticated request

## API Surface (v1)
- POST /api/billing/checkout
- POST /api/billing/webhook
- GET /api/subscription/status
- GET /api/scores
- POST /api/scores
- PATCH /api/scores/:id
- GET /api/draws/current
- POST /api/admin/draws/simulate
- POST /api/admin/draws/publish
- GET /api/charities
- POST /api/winner-proof
- POST /api/admin/winner-proof/:id/review

## Security
- Supabase RLS for user-owned data
- Server-only admin endpoints with role guard
- Razorpay webhook signature verification
- Strict input validation (zod)
- HTTPS-only deployment

## Scalability Notes
- Draw execution isolated in service module for cron/job migration
- Ledger tables are append-only for auditability
- Region-aware fields prepared for multi-country rollout
- API contracts are app-ready for future mobile clients

## Non-Functional Targets
- Mobile-first responsive UI
- Strong runtime validation and explicit error states
- p95 API target below 300ms for common reads
- Full audit trail for payouts and draw publication
