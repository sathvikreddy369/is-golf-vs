# Golf Charity Subscription Platform

Implementation of the PRD assignment for a subscription product combining golf score tracking, monthly draws, and charitable giving.

## Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4
- Supabase (Auth + Postgres + Storage)
- Razorpay Subscriptions
- Vercel deployment (frontend)
- Render deployment (backend API)

## Project Docs
- Architecture: docs/v1-architecture.md
- Delivery roadmap: docs/implementation-plan.md
- Initial database schema: supabase/schema.sql

## Local Setup
1. Install dependencies:

```bash
npm install
```

2. Copy environment template and fill values:

```bash
cp .env.example .env.local
```

Set `NEXT_PUBLIC_API_BASE_URL` to your backend URL.
Set `BACKEND_INTERNAL_API_SECRET` to the same value as backend `BACKEND_INTERNAL_API_SECRET` for server-to-server notification calls.

3. Start development server:

```bash
npm run dev
```

Open http://localhost:3000.

## Commands
- Dev: npm run dev
- Lint: npm run lint
- Typecheck: npm run typecheck
- Build: npm run build
- Start production build: npm run start

## Testing Strategy (v1)
- Unit tests for core domain logic:
	- Score validation and latest-5 retention logic
	- Draw matching and prize split calculations
	- Charity minimum contribution validation
- Integration tests for:
	- Razorpay webhooks
	- Role-based access
	- Admin publication workflow
- End-to-end tests:
	- Signup -> Subscribe -> Scores -> Draw -> Verification -> Payout

Test tooling will be added in the next implementation phase.

## Deployment
PRD constraints require:
- New Vercel project
- New Supabase project
- New Render service for backend API

Deployment config files:
- Vercel: `vercel.json`
- Render: `../render.yaml`

Deployment sequence:
1. Configure Supabase schema using supabase/schema.sql.
2. Create a public Supabase Storage bucket named `winner-proofs`.
3. Deploy backend service on Render from `backend` folder.
4. Configure Razorpay plans and set webhook endpoint to backend `/api/billing/webhook`.
5. Set frontend env vars in Vercel, including `NEXT_PUBLIC_API_BASE_URL`.
6. Deploy frontend from `frontend` folder.
7. Validate webhook delivery and auth + subscription access control.

Important: re-run schema migration after recent updates to ensure `webhook_event_logs` table exists for webhook idempotency.
