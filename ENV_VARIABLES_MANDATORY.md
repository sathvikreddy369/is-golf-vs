# 7 Mandatory Environment Variables

**THAT'S IT. THESE 7 ARE ALL YOU NEED TO GET STARTED.**

---

## 🎯 The 7 Variables

### From Supabase Dashboard (3 variables)

1. **NEXT_PUBLIC_SUPABASE_URL**
   - From: Supabase → Settings → API → "Project URL"
   - Example: `https://xyz123.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - From: Supabase → Settings → API → "anon public" key
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **SUPABASE_SERVICE_ROLE_KEY**
   - From: Supabase → Settings → API → "service_role" secret key
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Generate Yourself (2 variables)

4. **BACKEND_INTERNAL_API_SECRET**
   - Run: `openssl rand -base64 32`
   - Example: `XUZzVH2kLmT5pZ9k/abc123def456=`

5. **CRON_SECRET**
   - Run: `openssl rand -base64 32`
   - Example: `jK7mN9pS/def456ghi789jkl012=`

### Configuration (2 variables)

6. **NEXT_PUBLIC_API_BASE_URL** (Frontend)
   - Value: `https://is-golf-vs.onrender.com`

7. **FRONTEND_ORIGIN** (Backend)
   - Value: `https://is-golf-vs.vercel.app`

---

## 🔄 Where to Put Them

### Frontend (Vercel Dashboard)
```
Settings → Environment Variables

NEXT_PUBLIC_SUPABASE_URL = (from step 1)
NEXT_PUBLIC_SUPABASE_ANON_KEY = (from step 2)
NEXT_PUBLIC_API_BASE_URL = https://is-golf-vs.onrender.com
BACKEND_INTERNAL_API_SECRET = (from step 4)
NEXT_PUBLIC_APP_URL = https://is-golf-vs.vercel.app
```

### Backend (Render Dashboard)
```
Environment

PORT = 10000
FRONTEND_ORIGIN = https://is-golf-vs.vercel.app
SUPABASE_URL = (from step 1)
SUPABASE_SERVICE_ROLE_KEY = (from step 3)
BACKEND_INTERNAL_API_SECRET = (from step 4 - MUST MATCH FRONTEND)
CRON_SECRET = (from step 5)
```

---

## ✅ Verification

After setting all 7:

```bash
# Test Backend
curl https://is-golf-vs.onrender.com/health

# Open Frontend
https://is-golf-vs.vercel.app
# Should load without errors ✓
```

---

## 🎯 That's Literally It

You can stop learning stuff now. You have everything needed to deploy.

Go set these 7 variables and deploy! 🚀
