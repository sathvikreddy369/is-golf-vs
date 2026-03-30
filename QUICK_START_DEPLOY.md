# Deployment Quick Reference

## Quick Setup for Production

### Prerequisites
- GitHub account with repository set up
- Render.com account (free tier available)
- Vercel account (free tier available)
- Supabase account (free tier available)
- Razorpay account (for payment processing)
- Resend account (optional, for email notifications)

---

## 1. Database Setup (5 minutes)

```bash
# 1. Create Supabase project at https://supabase.com
# 2. Copy your project URL and anon key
# 3. Open SQL Editor in Supabase and copy-paste:
```

From `frontend/supabase/schema.sql`:
```bash
cat frontend/supabase/schema.sql
```
Paste entire contents into Supabase SQL Editor → Run

---

## 2. Backend Deployment to Render (10 minutes)

```bash
# Push code to GitHub first
git push origin main

# Then:
# 1. Go to https://render.com/dashboard
# 2. Click "New Web Service"
# 3. Connect your GitHub repository
# 4. Configure:
#    - Name: golf-charity-backend
#    - Root Directory: backend
#    - Runtime: Node
#    - Build Command: npm install && npm run build
#    - Start Command: npm run start
# 5. Copy your backend URL: https://golf-charity-backend.onrender.com
```

### Set Environment Variables in Render:
```
# Get these from Supabase Settings → Database → Connection string
SUPABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=<copy from Supabase>

# Get these from Razorpay Dashboard
RAZORPAY_KEY_ID=<from Razorpay>
RAZORPAY_KEY_SECRET=<from Razorpay>
RAZORPAY_WEBHOOK_SECRET=<from Razorpay>
RAZORPAY_PLAN_MONTHLY_ID=plan_xxxxx
RAZORPAY_PLAN_YEARLY_ID=plan_xxxxx

# Generate random secure strings
BACKEND_INTERNAL_API_SECRET=<generate>
CRON_SECRET=<generate>

# Set these
FRONTEND_ORIGIN=https://your-vercel-domain.vercel.app
PORT=10000
NODE_VERSION=22

# Optional
RESEND_API_KEY=<from Resend>
EMAIL_FROM=noreply@golfcharity.com
```

### Setup Cron Job:
```
In Render Dashboard:
- Create "Cron Job"
- URL: https://golf-charity-backend.onrender.com/api/internal/cron/monthly-draw
- Frequency: 0 0 1 * * (1st of every month)
- Method: POST
- Header: x-cron-secret: <your CRON_SECRET>
```

---

## 3. Frontend Deployment to Vercel (5 minutes)

```bash
# 1. Go to https://vercel.com/new
# 2. Import your GitHub repository
# 3. Configure:
#    - Framework: Next.js
#    - Root Directory: frontend
# 4. Deploy
# 5. Copy your frontend URL: https://project-name.vercel.app
```

### Set Environment Variables in Vercel:
```
NEXT_PUBLIC_SUPABASE_URL=<from Supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase>
NEXT_PUBLIC_API_BASE_URL=https://golf-charity-backend.onrender.com
BACKEND_INTERNAL_API_SECRET=<same as backend>
```

---

## 4. Razorpay Webhook Setup (5 minutes)

```
In Razorpay Dashboard:
- Settings → Webhooks
- Add Webhook:
  - URL: https://golf-charity-backend.onrender.com/api/billing/webhook
  - Events: 
    ✓ subscription.activated
    ✓ subscription.charged
    ✓ subscription.completed
    ✓ subscription.cancelled
    ✓ subscription.halted
    ✓ subscription.pending
  - Copy the webhook secret → RAZORPAY_WEBHOOK_SECRET
```

---

## 5. Verify Deployment

```bash
# Test frontend
curl https://your-vercel-app.vercel.app

# Test backend
curl https://golf-charity-backend.onrender.com/api/health

# Check logs
# Render: Dashboard → Logs
# Vercel: Dashboard → Deployments → Logs

# Test in browser
# 1. Go to https://your-vercel-app.vercel.app
# 2. Sign up with email
# 3. Try subscription flow
# 4. Check Database in Supabase
```

---

## Environment Variables Quick Map

| Variable | Where to Find |
|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
| `RAZORPAY_KEY_ID` | Razorpay → Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | Razorpay → Settings → API Keys |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay → Webhooks → your webhook |
| `RAZORPAY_PLAN_MONTHLY_ID` | Razorpay → Plans |
| `RAZORPAY_PLAN_YEARLY_ID` | Razorpay → Plans |
| `RESEND_API_KEY` | Resend → API Keys (optional) |
| `BACKEND_INTERNAL_API_SECRET` | Generate random string (use `openssl rand -base64 32`) |
| `CRON_SECRET` | Generate random string (use `openssl rand -base64 32`) |

---

## Testing Checklist

- [ ] Homepage loads without errors
- [ ] Can sign up and verify email
- [ ] Can log in and access dashboard
- [ ] Can browse charities
- [ ] Can select charity preference
- [ ] Can initiate subscription payment
- [ ] Razorpay payment gateway appears
- [ ] After payment, subscription status shows "active"
- [ ] Can see entries in Supabase `subscriptions` table
- [ ] Admin dashboard accessible with admin account
- [ ] Can see analytics in admin dashboard
- [ ] Monthly draw cron job shows in Render scheduled events

---

## Troubleshooting

### Frontend won't load
- Check Vercel deployment logs
- Verify environment variables set in Vercel
- Ensure backend URL is correct

### Backend not responding
- Check Render logs
- Verify environment variables in Render
- Restart service in Render dashboard

### Payment doesn't work
- Verify Razorpay keys in backend environment
- Check Razorpay dashboard for rejection reasons
- Verify webhook URL in Razorpay settings

### Email not sending
- Check RESEND_API_KEY is set
- Verify EMAIL_FROM has valid domain
- Check Resend dashboard for bounced emails

---

## Commands for Local Testing Before Deploy

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your local Supabase details
npm run typecheck  # Check for errors
npm run build      # Build
npm test          # Run tests (should see 6 passed)
npm run dev       # Start locally on port 4000

# Frontend (in another terminal)
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with local backend URL
npm run typecheck  # Check for errors
npm run build      # Build
npm run dev       # Start locally on port 3000

# Test in browser: http://localhost:3000
```

---

## Post-Launch Monitoring

1. **Render Dashboard**: Check backend logs regularly
2. **Vercel Dashboard**: Monitor deployment health
3. **Supabase Dashboard**: Check database usage, queries
4. **Razorpay Dashboard**: Monitor transactions
5. **Set up alerts** for errors (if available in service)

---

## Security Reminders

✓ `.gitignore` excludes all `.env` files (no secrets in repo)
✓ Use service role key only in backend (never expose to frontend)
✓ Use anon key in frontend (properly scoped with RLS)
✓ Verify webhook signatures server-side
✓ Generate new random secrets (BACKEND_INTERNAL_API_SECRET, CRON_SECRET)
✓ Keep API keys in environment variables, never in code
✓ Rotate secrets periodically
✓ Monitor for suspicious activity in logs

---

**Time Required**: ~25-30 minutes for complete setup
**Estimated Cost**: Free tier across all services initially
