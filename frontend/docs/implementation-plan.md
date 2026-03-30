# Implementation Plan

## Phase 1: Core Platform Setup (Day 1-2)
- Supabase project setup and schema migration
- Auth integration and role bootstrap
- App shell, route groups, and guards
- Environment variable management

## Phase 2: Billing and Access (Day 3-4)
- Razorpay plan setup (monthly, yearly)
- Checkout flow via frontend to backend billing API
- Webhook processing for lifecycle updates
- Subscription gate on protected features

## Phase 3: Scores and Dashboards (Day 5-6)
- Score CRUD with range/date validation
- Latest-5 rolling retention behavior
- Subscriber dashboard modules
- Basic admin user/subscription views

## Phase 4: Draw Engine and Prize Logic (Day 7-8)
- Draw number generation (random and weighted)
- Simulation mode
- Prize split and winner detection
- Jackpot rollover logic

## Phase 5: Charity and Verification (Day 9)
- Charity directory and profile pages
- Charity selection and contribution settings
- Winner proof upload and admin review
- Payout state updates

## Phase 6: Hardening and Release (Day 10)
- End-to-end flow validation
- Responsive and accessibility QA
- Monitoring, logging, and go-live checklist
- Deploy to fresh Vercel (frontend) + Render (backend) + Supabase

## Test Plan
- Unit: score rules, draw matcher, prize allocator, charity minimum checks
- Integration: webhook handlers, role guards, score retention trigger
- E2E: signup to payout lifecycle on mobile and desktop viewports
