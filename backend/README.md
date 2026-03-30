# Backend API

Express + TypeScript backend for billing, webhooks, and notifications.

## Endpoints

- GET /health
- POST /api/billing/create-subscription
- POST /api/billing/webhook
- POST /api/charity/create-donation-link
- POST /api/notifications/draw-published

Internal (secret-protected) endpoints:
- POST /api/internal/user-charity-preference/upsert
- POST /api/internal/winner-proof/upsert
- POST /api/internal/admin/charity/save
- POST /api/internal/admin/charity/delete
- POST /api/internal/admin/draw/simulate
- POST /api/internal/admin/draw/publish
- POST /api/internal/admin/verification/review
- POST /api/internal/admin/user/role
- POST /api/internal/admin/subscription/status
- POST /api/internal/admin/score/update
- POST /api/internal/admin/payout/mark-paid
- POST /api/internal/cron/monthly-draw

## Scripts

- npm run dev
- npm run build
- npm run start
- npm run typecheck

## Environment

Copy `.env.example` to `.env` and set all values.

Important billing vars:
- RAZORPAY_PLAN_MONTHLY_AMOUNT_CENTS
- RAZORPAY_PLAN_YEARLY_AMOUNT_CENTS

Optional notification vars:
- BACKEND_INTERNAL_API_SECRET
- CRON_SECRET
- RESEND_API_KEY
- EMAIL_FROM

## Render Deployment

- Service config is defined at `../render.yaml`
- Build command: `npm install && npm run build`
- Start command: `npm run start`

### Monthly Draw Scheduler (Render Cron Job)

Create a Render Cron Job to call the monthly draw endpoint.

1. In Render, open the backend service.
2. Go to Cron Jobs and create a new job.
3. Set method to POST.
4. Set URL to `https://<your-backend-domain>/api/internal/cron/monthly-draw`.
5. Add header `x-cron-secret: <CRON_SECRET>`.
6. Use schedule `0 0 1 * *` (midnight UTC on the 1st of every month).

Local manual trigger helper:

```bash
cd backend
BACKEND_URL=https://<your-backend-domain> CRON_SECRET=<your-cron-secret> ./scripts/trigger-monthly-draw.sh
```
