-- Golf Charity Subscription Platform v1 schema

create extension if not exists pgcrypto;

create type public.user_role as enum ('subscriber', 'admin');
create type public.subscription_status as enum ('inactive', 'active', 'past_due', 'canceled', 'lapsed');
create type public.draw_status as enum ('scheduled', 'simulated', 'published');
create type public.draw_mode as enum ('random', 'weighted');
create type public.match_tier as enum ('match_5', 'match_4', 'match_3');
create type public.verification_status as enum ('pending', 'approved', 'rejected');
create type public.payout_status as enum ('pending', 'paid');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'subscriber',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider_customer_id text,
  provider_subscription_id text unique,
  plan_interval text not null check (plan_interval in ('monthly', 'yearly')),
  status public.subscription_status not null default 'inactive',
  amount_cents integer not null check (amount_cents > 0),
  started_at timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.charities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  image_url text,
  upcoming_events jsonb not null default '[]'::jsonb,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_charity_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  charity_id uuid not null references public.charities(id),
  contribution_percent numeric(5,2) not null check (contribution_percent >= 10 and contribution_percent <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.score_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score_date date not null,
  stableford_score smallint not null check (stableford_score between 1 and 45),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists score_entries_user_created_idx on public.score_entries(user_id, created_at desc);

create or replace function public.enforce_latest_five_scores()
returns trigger
language plpgsql
as $$
begin
  delete from public.score_entries
  where id in (
    select id
    from public.score_entries
    where user_id = new.user_id
    order by created_at desc
    offset 5
  );

  return new;
end;
$$;

create trigger trg_enforce_latest_five_scores
after insert on public.score_entries
for each row execute procedure public.enforce_latest_five_scores();

create table if not exists public.draws (
  id uuid primary key default gen_random_uuid(),
  draw_month date not null unique,
  mode public.draw_mode not null,
  status public.draw_status not null default 'scheduled',
  winning_numbers integer[] not null,
  rollover_cents integer not null default 0,
  executed_at timestamptz,
  published_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint draw_numbers_count check (array_length(winning_numbers, 1) = 5)
);

create table if not exists public.prize_pool_ledger (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  active_subscribers integer not null check (active_subscribers >= 0),
  total_pool_cents integer not null check (total_pool_cents >= 0),
  tier_5_cents integer not null check (tier_5_cents >= 0),
  tier_4_cents integer not null check (tier_4_cents >= 0),
  tier_3_cents integer not null check (tier_3_cents >= 0),
  rollover_in_cents integer not null default 0,
  rollover_out_cents integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.draw_winners (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier public.match_tier not null,
  prize_cents integer not null check (prize_cents >= 0),
  payout_status public.payout_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (draw_id, user_id, tier)
);

create table if not exists public.draw_participants (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_count smallint not null check (match_count between 0 and 5),
  created_at timestamptz not null default now(),
  unique (draw_id, user_id)
);

create table if not exists public.winner_verifications (
  id uuid primary key default gen_random_uuid(),
  winner_id uuid not null unique references public.draw_winners(id) on delete cascade,
  proof_file_url text not null,
  status public.verification_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payout_transactions (
  id uuid primary key default gen_random_uuid(),
  winner_id uuid not null unique references public.draw_winners(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  status public.payout_status not null default 'pending',
  paid_at timestamptz,
  reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_event_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_key text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.charities enable row level security;
alter table public.user_charity_preferences enable row level security;
alter table public.score_entries enable row level security;
alter table public.draws enable row level security;
alter table public.prize_pool_ledger enable row level security;
alter table public.draw_participants enable row level security;
alter table public.draw_winners enable row level security;
alter table public.winner_verifications enable row level security;
alter table public.payout_transactions enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "subscriptions_select_own"
on public.subscriptions
for select
using (auth.uid() = user_id);

create policy "score_entries_all_own"
on public.score_entries
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "charities_select_all"
on public.charities
for select
using (true);

create policy "user_charity_preferences_all_own"
on public.user_charity_preferences
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "draws_select_all"
on public.draws
for select
using (true);

create policy "prize_pool_ledger_select_all"
on public.prize_pool_ledger
for select
using (true);

create policy "draw_participants_select_own"
on public.draw_participants
for select
using (auth.uid() = user_id);

create policy "draw_winners_select_own"
on public.draw_winners
for select
using (auth.uid() = user_id);

create policy "winner_verifications_select_own"
on public.winner_verifications
for select
using (
  exists (
    select 1
    from public.draw_winners dw
    where dw.id = winner_verifications.winner_id
      and dw.user_id = auth.uid()
  )
);

create policy "winner_verifications_upsert_own"
on public.winner_verifications
for insert
with check (
  exists (
    select 1
    from public.draw_winners dw
    where dw.id = winner_verifications.winner_id
      and dw.user_id = auth.uid()
  )
);

create policy "winner_verifications_update_own"
on public.winner_verifications
for update
using (
  exists (
    select 1
    from public.draw_winners dw
    where dw.id = winner_verifications.winner_id
      and dw.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.draw_winners dw
    where dw.id = winner_verifications.winner_id
      and dw.user_id = auth.uid()
  )
);

create policy "payout_transactions_select_own"
on public.payout_transactions
for select
using (
  exists (
    select 1
    from public.draw_winners dw
    where dw.id = payout_transactions.winner_id

      -- Admin policies for charities management
      create policy "charities_insert_admin"
      on public.charities
      for insert
      with check (
        exists (
          select 1
          from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );

      create policy "charities_update_admin"
      on public.charities
      for update
      using (
        exists (
          select 1
          from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );

      create policy "charities_delete_admin"
      on public.charities
      for delete
      using (
        exists (
          select 1
          from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );

      -- Admin policies for draws management
      create policy "draws_insert_admin"
      on public.draws
      for insert
      with check (
        exists (
          select 1
          from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );

      create policy "draws_update_admin"
      on public.draws
      for update
      using (
        exists (
          select 1
          from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );

      -- Admin policies for prize pool ledger
      create policy "prize_pool_ledger_insert_admin"
      on public.prize_pool_ledger
      for insert
      with check (
        exists (
          select 1
          from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );

      -- Admin policies for winner verifications (review/approve)
      create policy "winner_verifications_select_admin"
      on public.winner_verifications
      for select
      using (
        auth.uid() is null or
        exists (
          select 1
          from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );

      create policy "winner_verifications_update_admin"
      on public.winner_verifications
      for update
      using (
        exists (
          select 1
          from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      )
      with check (
        exists (
          select 1
          from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );

      -- Admin policies for payout transactions
      create policy "payout_transactions_insert_admin"
      on public.payout_transactions
      for insert
      with check (
        exists (
          select 1
          from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );

      create policy "payout_transactions_update_admin"
      on public.payout_transactions
      for update
      using (
        exists (
          select 1
          from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );

      -- Webhook event logs - backend service role only (no frontend access)
      create policy "webhook_event_logs_select_admin"
      on public.webhook_event_logs
      for select
      using (
        exists (
          select 1
          from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );

      -- Admin can view all user subscriptions for dashboard
      create policy "subscriptions_select_admin"
      on public.subscriptions
      for select
      using (
        exists (
          select 1
          from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );

      -- Admin can view all draw participants
      create policy "draw_participants_select_admin"
      on public.draw_participants
      for select
      using (
        exists (
          select 1
          from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );

      -- Admin can view all draw winners
      create policy "draw_winners_select_admin"
      on public.draw_winners
      for select
      using (
        exists (
          select 1
          from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );

      -- Admin can view profiles for user management
      create policy "profiles_select_admin"
      on public.profiles
      for select
      using (
        exists (
          select 1
          from public.profiles p2
          where p2.id = auth.uid() and p2.role = 'admin'
        )
      );
      and dw.user_id = auth.uid()
  )
);
