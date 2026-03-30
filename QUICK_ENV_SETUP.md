# Quick Setup Guide - 7 Mandatory Variables Only

**Setup Time**: 10 minutes  
**Difficulty**: Easy  
**No payments needed for basic testing** ✅

---

## Step 1: Get Supabase Credentials (3 variables)

Go to: https://supabase.com/dashboard

1. **Select your project** (or create one)
2. Go to **Settings → API** in left sidebar
3. Copy these 3 values:

```
NEXT_PUBLIC_SUPABASE_URL = Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY = Anon (public) key
SUPABASE_SERVICE_ROLE_KEY = service_role secret key
```

---

## Step 2: Generate 2 Random Secrets

Run this command twice (macOS/Linux):
```bash
openssl rand -base64 32
```

You'll get something like: `XUZzVH2k...` (copy each one)

```
BACKEND_INTERNAL_API_SECRET = (first random string)
CRON_SECRET = (second random string)
```

---

## Step 3: Set Frontend Environment Variables

**File**: In Vercel Dashboard → Project Settings → Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_API_BASE_URL=https://is-golf-vs.onrender.com
BACKEND_INTERNAL_API_SECRET=XUZzVH2k...
NEXT_PUBLIC_APP_URL=https://is-golf-vs.vercel.app
```

---

## Step 4: Set Backend Environment Variables

**File**: In Render Dashboard → Environment

```
PORT=10000
FRONTEND_ORIGIN=https://is-golf-vs.vercel.app
SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
BACKEND_INTERNAL_API_SECRET=XUZzVH2k... (SAME AS FRONTEND)
CRON_SECRET=LmT5pZ9k...
```

---

## 🎯 Summary

You need exactly **7 values**:

| # | Variable | From Where | Example |
|---|----------|-----------|---------|
| 1 | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Settings | `https://abc.supabase.co` |
| 2 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Settings | `eyJhbGc...` |
| 3 | `SUPABASE_SERVICE_ROLE_KEY` | Supabase Settings | `eyJhbGc...` |
| 4 | `BACKEND_INTERNAL_API_SECRET` | Generate | `openssl rand -base64 32` |
| 5 | `CRON_SECRET` | Generate | `openssl rand -base64 32` |
| 6 | BACKEND `FRONTEND_ORIGIN` | Config | `https://is-golf-vs.vercel.app` |
| 7 | FRONTEND `NEXT_PUBLIC_API_BASE_URL` | Config | `https://is-golf-vs.onrender.com` |

---

## ✅ Verification

After setting all 7:

1. Deploy backend to Render
2. Deploy frontend to Vercel
3. Open `https://is-golf-vs.vercel.app`
4. Should load without errors ✓

---

## 📌 Important Notes

- ✅ Generate **NEW** secrets for production (don't reuse dev ones)
- ✅ Make sure `BACKEND_INTERNAL_API_SECRET` is **SAME** in both frontend and backend
- ✅ `SUPABASE_SERVICE_ROLE_KEY` should ONLY be in backend (never frontend)
- ✅ All 7 variables are needed for the app to start
- ❌ Payments are OPTIONAL (add Razorpay variables later if needed)

---

**Ready?** Go set your variables and deploy! 🚀
