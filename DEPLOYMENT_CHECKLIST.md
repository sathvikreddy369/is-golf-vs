# Deployment Checklist

This document outlines all required steps to deploy the Golf Charity Platform to production.

## Project Structure ✓
```
is-prd-fs/
├── .gitignore              ✓ (covers both projects)
├── README.md               ✓ (deployment instructions)
├── DEPLOYMENT_CHECKLIST.md ✓ (this file)
├── render.yaml             ✓ (Render backend config)
├── PRD Full Stack Training.pdf (requirement document)
│
├── frontend/               (Vercel deployment)
│   ├── .gitignore          ✓ (Next.js specific)
│   ├── .env.example        ✓ (template)
│   ├── package.json        ✓ (scripts configured)
│   ├── next.config.ts      ✓
│   ├── vercel.json         ✓ (regions set to bom1)
│   ├── tsconfig.json       ✓
│   ├── postcss.config.mjs  ✓
│   ├── eslint.config.mjs   ✓
│   ├── middleware.ts       ✓ (Supabase middleware)
│   ├── src/
│   │   ├── app/            ✓ (all pages present)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx (home)
│   │   │   ├── login/page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── admin/page.tsx
│   │   │   ├── charities/page.tsx
│   │   │   ├── charities/[slug]/page.tsx
│   │   │   ├── auth/callback/route.ts
│   │   │   └── globals.css
│   │   ├── lib/
│   │   │   ├── supabase.ts (client & server)
│   │   │   ├── backend.ts (API calls)
│   │   │   └── draws.ts (utilities)
│   │   └── components/ (if any)
│   ├── public/             ✓ (SVG assets)
│   └── supabase/
│       └── schema.sql      ✓ (database migration)
│
└── backend/                (Render deployment)
    ├── .gitignore          ✓ (Node.js specific)
    ├── .env.example        ✓ (template)
    ├── package.json        ✓ (scripts configured)
    ├── tsconfig.json       ✓
    ├── src/
    │   ├── index.ts        ✓ (Express server)
    │   ├── config.ts       ✓
    │   ├── razorpay.ts     ✓ (webhook handler)
    │   ├── supabase.ts     ✓ (admin client)
    │   ├── draws.ts        ✓ (draw logic)
    │   ├── draws.test.ts   ✓ (tests)
    │   └── notifications.ts ✓ (Resend integration)
    ├── scripts/
    │   └── trigger-monthly-draw.sh ✓
    └── README.md           ✓
```

---

## Pre-Deployment Checklist

### 1. Local Development Setup
- [ ] Clone repository
- [ ] Run `npm install` in both frontend and backend
- [ ] Prepare `.env` files using `.env.example` templates:
  - [ ] `frontend/.env.local`
  - [ ] `backend/.env`
- [ ] Test locally: `npm run dev` in both folders
- [ ] Run tests: `npm test` (backend)
- [ ] Run build: `npm run build` (both)

### 2. Version Control & Git
- [ ] Initialize git if not done: `git init`
- [ ] Add remotes: `git remote add origin <your-github-url>`
- [ ] Verify `.gitignore` files are present:
  - [ ] Root `.gitignore` (covers both projects)
  - [ ] `backend/.gitignore`
  - [ ] `frontend/.gitignore` (already present)
- [ ] Ensure NO `.env` files are tracked (only `.env.example`)
- [ ] Ensure NO `node_modules/`, `dist/`, `.next/` are tracked
- [ ] Commit: `git add . && git commit -m "Initial commit"`
- [ ] Push: `git push -u origin main`

### 3. Supabase Setup
- [ ] Create Supabase project
- [ ] Copy database URL and service role key
- [ ] Run migration: Execute `frontend/supabase/schema.sql` in Supabase SQL editor
  - [ ] Verify all tables created: profiles, subscriptions, charities, draws, etc.
  - [ ] Verify `draw_participants` table exists
  - [ ] Verify RLS policies are active
- [ ] Set connection pooling: Enable PgBouncer in Supabase project settings
- [ ] Copy connection pool URL for `DATABASE_URL`
- [ ] Copy direct connection URL for `DIRECT_URL`

### 4. Razorpay Setup
- [ ] Create Razorpay account (if not done)
- [ ] Create monthly plan: note the `RAZORPAY_PLAN_MONTHLY_ID`
- [ ] Create yearly plan: note the `RAZORPAY_PLAN_YEARLY_ID`
- [ ] Create webhook: 
  - [ ] Set webhook URL to: `https://<backend-domain>/api/billing/webhook`
  - [ ] Enable events: `subscription.activated`, `subscription.charged`, `subscription.completed`, `subscription.cancelled`, `subscription.halted`, `subscription.pending`
  - [ ] Copy webhook secret: `RAZORPAY_WEBHOOK_SECRET`
- [ ] Copy API credentials: `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`

### 5. Resend (Email) Setup (Optional but Recommended)
- [ ] Create Resend account: https://resend.com
- [ ] Create API key: `RESEND_API_KEY`
- [ ] Set sender email in backend: `EMAIL_FROM` (e.g., `noreply@golfcharity.com`)
- [ ] Verify domain or use default Resend domain

### 6. Backend Deployment (Render)

#### 6a. Create Render Service
- [ ] Connect GitHub repo to Render
- [ ] Create new Web Service from repository root
- [ ] Configure:
  - [ ] Root Directory: `backend`
  - [ ] Runtime: Node
  - [ ] Node Version: 22
  - [ ] Build Command: `npm install && npm run build`
  - [ ] Start Command: `npm run start`
- [ ] Copy backend URL: `https://<service-name>.onrender.com`

#### 6b. Set Environment Variables (in Render Dashboard)
```
PORT=10000
NODE_VERSION=22
FRONTEND_ORIGIN=https://<your-vercel-domain>

# Razorpay
RAZORPAY_KEY_ID=<from Razorpay>
RAZORPAY_KEY_SECRET=<from Razorpay>
RAZORPAY_WEBHOOK_SECRET=<from Razorpay>
RAZORPAY_PLAN_MONTHLY_ID=<from Razorpay>
RAZORPAY_PLAN_YEARLY_ID=<from Razorpay>
RAZORPAY_PLAN_MONTHLY_AMOUNT_CENTS=100000
RAZORPAY_PLAN_YEARLY_AMOUNT_CENTS=1000000

# Supabase
SUPABASE_URL=<from Supabase project settings>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase API keys>

# Internal Security
BACKEND_INTERNAL_API_SECRET=<generate strong random string>
CRON_SECRET=<generate strong random string>

# Email (if using Resend)
RESEND_API_KEY=<from Resend>
EMAIL_FROM=noreply@golfcharity.com

# Database (Supabase connection pooling)
DATABASE_URL=postgresql://postgres.<project>:[PASSWORD]@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.<project>:[PASSWORD]@aws-1-<region>.pooler.supabase.com:5432/postgres
```

#### 6c. Configure Render Cron Job
- [ ] Go to Render Dashboard → Create Cron Job
- [ ] Configure:
  - [ ] Name: `monthly-draw`
  - [ ] URL: `https://<backend-domain>/api/internal/cron/monthly-draw`
  - [ ] Frequency: `0 0 1 * *` (1st day of every month at midnight UTC)
  - [ ] HTTP Method: `POST`
  - [ ] **Important**: Add header `x-cron-secret: <value-from-CRON_SECRET>`

### 7. Frontend Deployment (Vercel)

#### 7a. Deploy to Vercel
- [ ] Go to https://vercel.com/new
- [ ] Import GitHub Repository
- [ ] Configure:
  - [ ] Framework: Next.js (auto-detected)
  - [ ] Root Directory: `frontend`
  - [ ] Build Command: `npm run build` (auto preset)
  - [ ] Installation Command: `npm install` (auto preset)
  - [ ] Output Directory: `.next` (auto preset)
- [ ] Copy production domain: `https://<project>.vercel.app`

#### 7b. Set Environment Variables (in Vercel Dashboard)
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<from Supabase project settings>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase API keys (anon/public)>

# Backend API
NEXT_PUBLIC_API_BASE_URL=https://<backend-domain>

# Internal API Auth
BACKEND_INTERNAL_API_SECRET=<same value as backend>
```

#### 7c. Verify Domains
- [ ] Add custom domain in Vercel (if applicable)
- [ ] Update Razorpay webhook CORS settings to include Vercel domain

---

## Post-Deployment Testing

### 1. Health Checks
- [ ] Frontend loads: `https://<vercel-domain>`
- [ ] Backend responds: `curl https://<backend-domain>/health` (if endpoint exists)
- [ ] Database connection works (check Render logs)

### 2. Authentication Flow
- [ ] Sign up with email
- [ ] Verify email confirmation link
- [ ] Login successfully
- [ ] Logout successfully

### 3. Subscription Flow
- [ ] Browse charities
- [ ] Choose charity preference
- [ ] Initiate subscription purchase
- [ ] Complete Razorpay payment
- [ ] Verify subscription status updated in dashboard
- [ ] Check Supabase `subscriptions` table has entry

### 4. Draw Participation (Manual Test)
- [ ] Entry scores manually in dashboard OR via API
- [ ] Wait for cron job to run (or manually trigger via endpoint with proper auth)
- [ ] Verify draw executed successfully
- [ ] Check winners in admin dashboard
- [ ] Verify `draw_winners` table populated
- [ ] Verify `draw_participants` table has all entries

### 5. Admin Features
- [ ] Admin login
- [ ] View analytics dashboard
- [ ] View all users, subscriptions, draws
- [ ] Create/manage charities
- [ ] Featured charity tagging
- [ ] Prize pool management
- [ ] Winner verification process

### 6. Email Notifications (if Resend enabled)
- [ ] Subscription confirmation email sent
- [ ] Draw published notification sent
- [ ] Winner alert email sent
- [ ] Check email logs in Resend dashboard

### 7. Security Checks
- [ ] CORS allows frontend domain only
- [ ] API endpoints require proper authentication headers
- [ ] Webhook signature verification working
- [ ] Cron job authentication working
- [ ] No sensitive data in browser console
- [ ] No secrets leaked in error messages

---

## Monitoring & Maintenance

### 1. Logging Setup
- [ ] Check Render logs regularly: `Logs` tab in Render Dashboard
- [ ] Check Vercel deployment logs: `Deployments` tab in Vercel
- [ ] Monitor Supabase for slow queries: `Database` → `Reports`
- [ ] Setup alerts in Render and Vercel (optional)

### 2. Database Maintenance
- [ ] Set up Supabase backup: `Settings` → `Backups`
- [ ] Run periodic connection pool diagnostics
- [ ] Monitor storage usage in Supabase

### 3. Updates & Dependencies
- [ ] Keep dependencies updated: `npm outdated`, `npm update`
- [ ] Monitor security advisories: `npm audit`
- [ ] Deploy updates to Vercel (via git push) and Render (auto redeploy on push)

### 4. Performance
- [ ] Monitor frontend Core Web Vitals in Vercel Analytics
- [ ] Monitor API response times in Render logs
- [ ] Optimize database queries if needed

---

## Troubleshooting

### Issue: Frontend can't reach backend
- [ ] Verify `NEXT_PUBLIC_API_BASE_URL` is set correctly in Vercel
- [ ] Check CORS configuration in backend (`cors` middleware)
- [ ] Verify backend is running: check Render logs
- [ ] Verify firewall/security rules allow requests

### Issue: Subscription webhook not firing
- [ ] Verify webhook URL in Razorpay matches backend domain
- [ ] Check backend logs for webhook requests
- [ ] Verify `RAZORPAY_WEBHOOK_SECRET` matches Razorpay settings
- [ ] Test webhook manually from Razorpay dashboard

### Issue: Draw cron job not running
- [ ] Verify Render Cron Job configuration
- [ ] Check Render logs for scheduled job execution
- [ ] Verify `CRON_SECRET` header is being sent
- [ ] Verify backend is running and healthy

### Issue: Database connection pooling errors
- [ ] Check connection pool exhaustion in Supabase
- [ ] Verify `DATABASE_URL` format is correct
- [ ] Check backend connection pool configuration
- [ ] Monitor active connections in Supabase dashboard

### Issue: RLS policies blocking queries
- [ ] Verify service role key is set for admin queries
- [ ] Verify user auth tokens are valid for user queries
- [ ] Check RLS policies in Supabase: `Settings` → `Auth Policies`

---

## File Checklist Summary

### Root Level
- [x] `.gitignore` - Covers both projects, excludes sensitive files
- [x] `README.md` - Basic setup and deployment info
- [x] `DEPLOYMENT_CHECKLIST.md` - This file
- [x] `render.yaml` - Render deployment config
- [x] `PRD Full Stack Training.pdf` - Requirements document

### Frontend
- [x] `package.json` - Build, dev, lint, typecheck scripts
- [x] `next.config.ts` - Next.js configuration
- [x] `vercel.json` - Vercel deployment config
- [x] `tsconfig.json` - TypeScript config
- [x] `.env.example` - Environment template
- [x] `.gitignore` - Git ignore rules
- [x] `middleware.ts` - Supabase auth middleware
- [x] `supabase/schema.sql` - Full database schema with migrations
- [x] All pages and components present

### Backend
- [x] `package.json` - Build, dev, start, test, typecheck scripts
- [x] `tsconfig.json` - TypeScript config
- [x] `.env.example` - Environment template
- [x] `.gitignore` - Git ignore rules
- [x] `src/index.ts` - Express server entry point
- [x] `src/draws.ts` - Draw logic (tested)
- [x] `src/draws.test.ts` - Unit tests
- [x] `src/razorpay.ts` - Webhook handler
- [x] `src/supabase.ts` - Database client
- [x] `src/notifications.ts` - Email integration
- [x] `src/config.ts` - Config parser
- [x] `scripts/trigger-monthly-draw.sh` - Manual cron trigger script

---

## Final Pre-Launch Steps

1. [ ] Run full build pipeline locally:
   ```bash
   cd frontend && npm run build && npm run lint && npm run typecheck
   cd ../backend && npm run build && npm run typecheck && npm test
   ```

2. [ ] Verify all environment variables are documented and set

3. [ ] Do a complete test run on staging URLs

4. [ ] Have incident response plan ready

5. [ ] Notify team members of go-live

6. [ ] Keep monitoring dashboard open during first hours of launch

---

**Last Updated:** March 30, 2026
**Status:** Ready for Deployment
