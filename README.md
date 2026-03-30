# Golf Charity Platform

A full-stack platform for managing golf charity tournaments with subscription-based entry, monthly draws, and prize distribution.

**Status**: 🟢 Ready for Production Deployment

## 📋 Documentation

- **[DEPLOYMENT_READY.md](./DEPLOYMENT_READY.md)** - ✅ Status report and summary
- **[QUICK_START_DEPLOY.md](./QUICK_START_DEPLOY.md)** - 🚀 Fast track deployment (25-30 mins)
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - 📋 Complete step-by-step guide
- **[verify-deployment.sh](./verify-deployment.sh)** - 🔍 Automated verification script

## Project Structure

This workspace is split for independent deployment:

- **frontend**: Next.js 16 app (deploy to Vercel)
- **backend**: Express API for billing and webhooks (deploy to Render)
- **PRD Full Stack Training.pdf**: Original requirement document

## 🏃 Local Development

**Prerequisites**: Node.js 18+ and npm

### Frontend Setup
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```
Opens at `http://localhost:3000`

### Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```
Starts at `http://localhost:4000`

### Running Tests
```bash
cd backend
npm test                # Run unit tests (6 tests)
npm run typecheck       # TypeScript validation
npm run build           # Production build
```

### Building for Production
```bash
# Frontend
cd frontend
npm run lint            # ESLint check
npm run typecheck       # TypeScript check
npm run build           # Next.js build

# Backend
cd backend
npm run typecheck       # TypeScript check
npm run build           # TypeScript compile
```

## ☁️ Deployment

### Quick Start (25-30 minutes)
1. Read [QUICK_START_DEPLOY.md](./QUICK_START_DEPLOY.md)
2. Follow the environment setup steps
3. Deploy to Render (backend) and Vercel (frontend)
4. Run [verify-deployment.sh](./verify-deployment.sh) to validate

### Comprehensive Guide
Follow [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for:
- Complete environment variable setup
- All integrations (Razorpay, Supabase, Resend)
- Database migration steps
- Post-deployment testing
- Monitoring and maintenance

## 🔧 Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
BACKEND_INTERNAL_API_SECRET=
```

### Backend (.env)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
BACKEND_INTERNAL_API_SECRET=
CRON_SECRET=
```

See `.env.example` files in each folder for complete list.

## 🗄️ Database

- **Type**: Supabase (PostgreSQL with Row-Level Security)
- **Schema**: `frontend/supabase/schema.sql`
- **Tables**: 11 (profiles, subscriptions, charities, draws, participants, winners, etc.)
- **Setup**: Copy schema into Supabase SQL editor and run

## 🔐 Security

✅ All secrets in `.env` files (excluded via `.gitignore`)
✅ Service role key backend-only
✅ Anon key frontend with RLS policies
✅ Webhook signature verification
✅ Cron job authenticated with secret header

## 📊 Key Features

- ✅ User authentication and profiles
- ✅ Razorpay subscription integration (monthly/yearly)
- ✅ Charity selection and management
- ✅ Monthly draw with number generation
- ✅ Winner matching and verification
- ✅ Admin analytics and controls
- ✅ Email notifications (Resend)
- ✅ Automated monthly cron job

## 🧪 Testing

```bash
# Backend unit tests
cd backend
npm test

# Local validation
npm run typecheck
npm run build
```

Backend has 6 passing unit tests covering:
- Random number generation
- Weighted number selection
- Match counting logic
- Prize pool distribution
- Edge case handling

## 📦 Tech Stack

**Frontend**:
- Next.js 16 with App Router
- React 19
- TypeScript 5
- Tailwind CSS 4
- Supabase (auth + database)

**Backend**:
- Express 5
- Node.js 22
- TypeScript 6
- Razorpay SDK
- Supabase Admin Client

**Infrastructure**:
- Vercel (frontend hosting)
- Render (backend API)
- Supabase (database + auth)
- Razorpay (payments)
- Resend (email)

## 🚀 Deployment Targets

| Service | Component | Region | Config |
|---------|-----------|--------|--------|
| **Vercel** | Frontend | Global | [vercel.json](./frontend/vercel.json) |
| **Render** | Backend API | Oregon | [render.yaml](./render.yaml) |
| **Supabase** | Database | Configurable | [schema.sql](./frontend/supabase/schema.sql) |

## 📝 Configuration Files

- `.gitignore` - Excludes secrets and build outputs
- `render.yaml` - Render backend deployment configuration
- `frontend/vercel.json` - Vercel frontend deployment config
- `frontend/next.config.ts` - Next.js configuration
- `backend/tsconfig.json` - Backend TypeScript config
- `frontend/supabase/schema.sql` - Database schema with migrations

## 🐛 Troubleshooting

**Feature not working locally?**
1. Verify `.env` files are set up correctly
2. Run `npm install` in the folder
3. Check terminal output for error messages
4. Review DEPLOYMENT_CHECKLIST.md for env var details

**Build errors?**
1. Run `npm run typecheck` to see TypeScript errors
2. Run `npm run lint` (frontend only) for linting issues
3. Delete `node_modules` and `package-lock.json`, then `npm install`

## ✨ Ready to Deploy?

1. ✅ All source code present and working
2. ✅ Tests passing (backend)
3. ✅ Build validation passing (both)
4. ✅ Documentation complete
5. ✅ Security best practices implemented
6. ✅ Environment templates ready

**Start with** → [QUICK_START_DEPLOY.md](./QUICK_START_DEPLOY.md)
