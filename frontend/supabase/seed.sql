-- Comprehensive demo seed data for Golf Charity Platform.
-- Prerequisite: create at least 5 users in Supabase Auth (Authentication -> Users).
-- Safe to run multiple times.

begin;

insert into public.charities (slug, name, description, image_url, upcoming_events, is_featured)
values
  (
    'green-fairways-foundation',
    'Green Fairways Foundation',
    'Supports junior golf training and local youth development through coaching grants.',
    null,
    '["Junior Open Clinic - 2026-04-15", "School Golf Outreach - 2026-05-02"]'::jsonb,
    true
  ),
  (
    'swing-for-health',
    'Swing for Health',
    'Funds preventive health camps and community wellness drives in underserved areas.',
    null,
    '["Community Health Camp - 2026-04-20"]'::jsonb,
    true
  ),
  (
    'birdies-for-books',
    'Birdies for Books',
    'Provides books, school supplies, and mentorship programs for children.',
    null,
    '["Back to School Support - 2026-06-10"]'::jsonb,
    false
  ),
  (
    'tees-for-trees',
    'Tees for Trees',
    'Runs golf-led urban reforestation and green-course restoration initiatives.',
    null,
    '["City Replant Drive - 2026-04-28", "Urban Nursery Workshop - 2026-06-01"]'::jsonb,
    false
  ),
  (
    'fairway-food-bank',
    'Fairway Food Bank',
    'Supports food distribution networks and nutrition support for vulnerable families.',
    null,
    '["Weekend Meal Program - 2026-05-06"]'::jsonb,
    false
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  upcoming_events = excluded.upcoming_events,
  is_featured = excluded.is_featured,
  updated_at = now();

drop view if exists seed_users;
create temporary view seed_users as
select
  u.id,
  u.email,
  row_number() over (order by u.created_at, u.id) as rn
from auth.users u
limit 8;

insert into public.profiles (id, full_name, role)
select
  su.id,
  coalesce(nullif(split_part(su.email, '@', 1), ''), 'user_' || su.rn::text) as full_name,
  case when su.rn = 1 then 'admin'::public.user_role else 'subscriber'::public.user_role end as role
from seed_users su
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  updated_at = now();

-- Mixed subscription states across users.
insert into public.subscriptions (
  user_id,
  provider_customer_id,
  provider_subscription_id,
  plan_interval,
  status,
  amount_cents,
  started_at,
  current_period_end,
  canceled_at
)
select
  su.id,
  'seed_customer_' || su.rn::text,
  'seed_subscription_' || su.rn::text,
  case when su.rn % 2 = 0 then 'monthly' else 'yearly' end,
  case
    when su.rn = 2 then 'active'::public.subscription_status
    when su.rn = 3 then 'active'::public.subscription_status
    when su.rn = 4 then 'past_due'::public.subscription_status
    when su.rn = 5 then 'canceled'::public.subscription_status
    when su.rn = 6 then 'lapsed'::public.subscription_status
    else 'inactive'::public.subscription_status
  end,
  case when su.rn % 2 = 0 then 100000 else 1000000 end,
  now() - interval '45 days',
  now() + interval '20 days',
  case when su.rn = 5 then now() - interval '5 days' else null end
from seed_users su
where su.rn between 2 and 6
on conflict (provider_subscription_id) do update set
  status = excluded.status,
  amount_cents = excluded.amount_cents,
  current_period_end = excluded.current_period_end,
  canceled_at = excluded.canceled_at,
  updated_at = now();

-- User charity preference (>=10%) with different contribution levels.
insert into public.user_charity_preferences (user_id, charity_id, contribution_percent)
select
  su.id,
  c.id,
  case
    when su.rn = 2 then 20.00
    when su.rn = 3 then 35.00
    when su.rn = 4 then 15.00
    when su.rn = 5 then 50.00
    else 10.00
  end
from seed_users su
join public.charities c on
  c.slug = case
    when su.rn = 2 then 'green-fairways-foundation'
    when su.rn = 3 then 'swing-for-health'
    when su.rn = 4 then 'birdies-for-books'
    when su.rn = 5 then 'tees-for-trees'
    else 'fairway-food-bank'
  end
where su.rn between 2 and 6
on conflict (user_id) do update set
  charity_id = excluded.charity_id,
  contribution_percent = excluded.contribution_percent,
  updated_at = now();

-- Add recent score history (latest 5 retained by trigger).
insert into public.score_entries (user_id, score_date, stableford_score)
select
  su.id,
  (current_date - ((g.n * 6) + su.rn)::int),
  (((18 + su.rn + g.n) % 45) + 1)::smallint
from seed_users su
cross join generate_series(0, 6) as g(n)
where su.rn between 2 and 5
  and not exists (
    select 1
    from public.score_entries se
    where se.user_id = su.id
      and se.score_date = (current_date - ((g.n * 6) + su.rn)::int)
  );

insert into public.draws (draw_month, mode, status, winning_numbers, rollover_cents, executed_at, published_at)
values
  ('2026-02-01', 'random', 'published', '{7,12,18,29,41}', 0, now() - interval '50 days', now() - interval '50 days'),
  ('2026-03-01', 'weighted', 'published', '{5,11,22,33,44}', 250000, now() - interval '20 days', now() - interval '20 days'),
  ('2026-04-01', 'weighted', 'simulated', '{3,9,17,26,39}', 0, now() - interval '1 day', null),
  ('2026-05-01', 'random', 'scheduled', '{1,2,3,4,5}', 0, null, null)
on conflict (draw_month) do update set
  mode = excluded.mode,
  status = excluded.status,
  winning_numbers = excluded.winning_numbers,
  rollover_cents = excluded.rollover_cents,
  executed_at = excluded.executed_at,
  published_at = excluded.published_at,
  updated_at = now();

insert into public.prize_pool_ledger (
  draw_id,
  active_subscribers,
  total_pool_cents,
  tier_5_cents,
  tier_4_cents,
  tier_3_cents,
  rollover_in_cents,
  rollover_out_cents
)
select
  d.id,
  120,
  12000000,
  4800000,
  4200000,
  3000000,
  case when d.draw_month = '2026-03-01'::date then 250000 else 0 end,
  case when d.draw_month = '2026-03-01'::date then 250000 else 0 end
from public.draws d
where d.draw_month in ('2026-02-01', '2026-03-01')
  and not exists (
    select 1
    from public.prize_pool_ledger l
    where l.draw_id = d.id
  );

-- Participants and match counts for published March draw.
insert into public.draw_participants (draw_id, user_id, match_count)
select
  d.id,
  su.id,
  case
    when su.rn = 2 then 5
    when su.rn = 3 then 4
    when su.rn = 4 then 3
    when su.rn = 5 then 2
    else 1
  end
from public.draws d
join seed_users su on su.rn between 2 and 6
where d.draw_month = '2026-03-01'
on conflict (draw_id, user_id) do update set
  match_count = excluded.match_count,
  created_at = now();

insert into public.draw_winners (draw_id, user_id, tier, prize_cents, payout_status)
select
  d.id,
  su.id,
  case
    when su.rn = 2 then 'match_5'::public.match_tier
    when su.rn = 3 then 'match_4'::public.match_tier
    else 'match_3'::public.match_tier
  end,
  case
    when su.rn = 2 then 2400000
    when su.rn = 3 then 1400000
    else 750000
  end,
  case
    when su.rn = 2 then 'pending'::public.payout_status
    when su.rn = 3 then 'pending'::public.payout_status
    else 'paid'::public.payout_status
  end
from public.draws d
join seed_users su on su.rn in (2, 3, 4)
where d.draw_month = '2026-03-01'
on conflict (draw_id, user_id, tier) do update set
  prize_cents = excluded.prize_cents,
  payout_status = excluded.payout_status,
  created_at = now();

-- Winner verification moderation: one approved, one rejected.
insert into public.winner_verifications (
  winner_id,
  proof_file_url,
  status,
  reviewed_by,
  reviewed_at,
  review_notes
)
select
  w.id,
  'https://example.com/proofs/' || w.id::text || '.png',
  case
    when w.tier = 'match_5' then 'approved'::public.verification_status
    when w.tier = 'match_4' then 'rejected'::public.verification_status
    else 'pending'::public.verification_status
  end,
  admin_user.id,
  now() - interval '2 days',
  case
    when w.tier = 'match_5' then 'Verified scorecard and identity proof.'
    when w.tier = 'match_4' then 'Image quality insufficient, needs re-upload.'
    else null
  end
from public.draw_winners w
join seed_users admin_user on admin_user.rn = 1
on conflict (winner_id) do update set
  status = excluded.status,
  reviewed_by = excluded.reviewed_by,
  reviewed_at = excluded.reviewed_at,
  review_notes = excluded.review_notes,
  updated_at = now();

insert into public.payout_transactions (
  winner_id,
  amount_cents,
  status,
  paid_at,
  reference
)
select
  w.id,
  w.prize_cents,
  case when w.payout_status = 'paid' then 'paid'::public.payout_status else 'pending'::public.payout_status end,
  case when w.payout_status = 'paid' then now() - interval '1 day' else null end,
  case when w.payout_status = 'paid' then 'NEFT-SEED-' || left(w.id::text, 8) else null end
from public.draw_winners w
on conflict (winner_id) do update set
  amount_cents = excluded.amount_cents,
  status = excluded.status,
  paid_at = excluded.paid_at,
  reference = excluded.reference,
  updated_at = now();

insert into public.webhook_event_logs (provider, event_key)
values
  ('razorpay', 'seed_event_sub_activated_20260301'),
  ('razorpay', 'seed_event_sub_charged_20260305')
on conflict (event_key) do nothing;

commit;
