-- Deterministic seed by email for Golf Charity Platform.
-- Ensure these users exist in Supabase Auth before running:
--   admin@golfcharity.dev
--   subscriber1@golfcharity.dev
--   subscriber2@golfcharity.dev
--   subscriber3@golfcharity.dev

begin;

with required_users as (
  select id, email
  from auth.users
  where email in (
    'admin@golfcharity.dev',
    'subscriber1@golfcharity.dev',
    'subscriber2@golfcharity.dev',
    'subscriber3@golfcharity.dev'
  )
),
assert_count as (
  select case when count(*) = 4 then 1 else 0 end as ok from required_users
)
select case when ok = 1 then 1 else pg_sleep(0) end from assert_count;

insert into public.charities (slug, name, description, upcoming_events, is_featured)
values
  ('green-fairways-foundation', 'Green Fairways Foundation', 'Supports junior golf development.', '["Junior Open Clinic - 2026-04-15"]'::jsonb, true),
  ('swing-for-health', 'Swing for Health', 'Funds preventive health camps.', '["Community Health Camp - 2026-04-20"]'::jsonb, true),
  ('birdies-for-books', 'Birdies for Books', 'Provides books and school supplies.', '["Back to School Support - 2026-06-10"]'::jsonb, false)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  upcoming_events = excluded.upcoming_events,
  is_featured = excluded.is_featured,
  updated_at = now();

insert into public.profiles (id, full_name, role)
select
  u.id,
  case
    when u.email = 'admin@golfcharity.dev' then 'Platform Admin'
    when u.email = 'subscriber1@golfcharity.dev' then 'Subscriber One'
    when u.email = 'subscriber2@golfcharity.dev' then 'Subscriber Two'
    else 'Subscriber Three'
  end,
  case
    when u.email = 'admin@golfcharity.dev' then 'admin'::public.user_role
    else 'subscriber'::public.user_role
  end
from auth.users u
where u.email in (
  'admin@golfcharity.dev',
  'subscriber1@golfcharity.dev',
  'subscriber2@golfcharity.dev',
  'subscriber3@golfcharity.dev'
)
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  updated_at = now();

insert into public.subscriptions (
  user_id,
  provider_customer_id,
  provider_subscription_id,
  plan_interval,
  status,
  amount_cents,
  started_at,
  current_period_end
)
select
  u.id,
  'seed_customer_' || replace(u.email, '@', '_'),
  'seed_subscription_' || replace(u.email, '@', '_'),
  case when u.email = 'subscriber2@golfcharity.dev' then 'yearly' else 'monthly' end,
  case
    when u.email = 'subscriber1@golfcharity.dev' then 'active'::public.subscription_status
    when u.email = 'subscriber2@golfcharity.dev' then 'active'::public.subscription_status
    when u.email = 'subscriber3@golfcharity.dev' then 'past_due'::public.subscription_status
    else 'inactive'::public.subscription_status
  end,
  case when u.email = 'subscriber2@golfcharity.dev' then 1000000 else 100000 end,
  now() - interval '30 days',
  now() + interval '30 days'
from auth.users u
where u.email in (
  'subscriber1@golfcharity.dev',
  'subscriber2@golfcharity.dev',
  'subscriber3@golfcharity.dev'
)
on conflict (provider_subscription_id) do update set
  status = excluded.status,
  plan_interval = excluded.plan_interval,
  amount_cents = excluded.amount_cents,
  current_period_end = excluded.current_period_end,
  updated_at = now();

insert into public.user_charity_preferences (user_id, charity_id, contribution_percent)
select
  u.id,
  c.id,
  case
    when u.email = 'subscriber1@golfcharity.dev' then 25.00
    when u.email = 'subscriber2@golfcharity.dev' then 40.00
    else 15.00
  end
from auth.users u
join public.charities c on c.slug = case
  when u.email = 'subscriber1@golfcharity.dev' then 'green-fairways-foundation'
  when u.email = 'subscriber2@golfcharity.dev' then 'swing-for-health'
  else 'birdies-for-books'
end
where u.email in (
  'subscriber1@golfcharity.dev',
  'subscriber2@golfcharity.dev',
  'subscriber3@golfcharity.dev'
)
on conflict (user_id) do update set
  charity_id = excluded.charity_id,
  contribution_percent = excluded.contribution_percent,
  updated_at = now();

insert into public.score_entries (user_id, score_date, stableford_score)
select
  u.id,
  current_date - g.n,
  (20 + g.n + case when u.email = 'subscriber2@golfcharity.dev' then 5 else 0 end)::smallint
from auth.users u
cross join generate_series(0, 4) as g(n)
where u.email in (
  'subscriber1@golfcharity.dev',
  'subscriber2@golfcharity.dev',
  'subscriber3@golfcharity.dev'
)
  and not exists (
    select 1 from public.score_entries se where se.user_id = u.id and se.score_date = current_date - g.n
  );

insert into public.draws (draw_month, mode, status, winning_numbers, rollover_cents, executed_at, published_at)
values
  ('2026-03-01', 'weighted', 'published', '{5,11,22,33,44}', 250000, now() - interval '10 days', now() - interval '10 days'),
  ('2026-04-01', 'random', 'simulated', '{4,9,16,28,41}', 0, now() - interval '1 day', null)
on conflict (draw_month) do update set
  mode = excluded.mode,
  status = excluded.status,
  winning_numbers = excluded.winning_numbers,
  rollover_cents = excluded.rollover_cents,
  executed_at = excluded.executed_at,
  published_at = excluded.published_at,
  updated_at = now();

insert into public.draw_participants (draw_id, user_id, match_count)
select
  d.id,
  u.id,
  case
    when u.email = 'subscriber1@golfcharity.dev' then 5
    when u.email = 'subscriber2@golfcharity.dev' then 4
    else 3
  end
from public.draws d
join auth.users u on u.email in (
  'subscriber1@golfcharity.dev',
  'subscriber2@golfcharity.dev',
  'subscriber3@golfcharity.dev'
)
where d.draw_month = '2026-03-01'
on conflict (draw_id, user_id) do update set
  match_count = excluded.match_count,
  created_at = now();

insert into public.draw_winners (draw_id, user_id, tier, prize_cents, payout_status)
select
  d.id,
  u.id,
  case
    when u.email = 'subscriber1@golfcharity.dev' then 'match_5'::public.match_tier
    when u.email = 'subscriber2@golfcharity.dev' then 'match_4'::public.match_tier
    else 'match_3'::public.match_tier
  end,
  case
    when u.email = 'subscriber1@golfcharity.dev' then 2400000
    when u.email = 'subscriber2@golfcharity.dev' then 1400000
    else 750000
  end,
  case
    when u.email = 'subscriber3@golfcharity.dev' then 'paid'::public.payout_status
    else 'pending'::public.payout_status
  end
from public.draws d
join auth.users u on u.email in (
  'subscriber1@golfcharity.dev',
  'subscriber2@golfcharity.dev',
  'subscriber3@golfcharity.dev'
)
where d.draw_month = '2026-03-01'
on conflict (draw_id, user_id, tier) do update set
  prize_cents = excluded.prize_cents,
  payout_status = excluded.payout_status,
  created_at = now();

insert into public.winner_verifications (winner_id, proof_file_url, status, reviewed_by, reviewed_at, review_notes)
select
  w.id,
  'https://example.com/proofs/' || w.id::text || '.png',
  case
    when w.tier = 'match_5' then 'approved'::public.verification_status
    when w.tier = 'match_4' then 'rejected'::public.verification_status
    else 'pending'::public.verification_status
  end,
  admin_user.id,
  now() - interval '1 day',
  case
    when w.tier = 'match_5' then 'Approved by admin after evidence review.'
    when w.tier = 'match_4' then 'Rejected for unclear evidence image.'
    else null
  end
from public.draw_winners w
join auth.users admin_user on admin_user.email = 'admin@golfcharity.dev'
on conflict (winner_id) do update set
  status = excluded.status,
  reviewed_by = excluded.reviewed_by,
  reviewed_at = excluded.reviewed_at,
  review_notes = excluded.review_notes,
  updated_at = now();

insert into public.payout_transactions (winner_id, amount_cents, status, paid_at, reference)
select
  w.id,
  w.prize_cents,
  case when w.payout_status = 'paid' then 'paid'::public.payout_status else 'pending'::public.payout_status end,
  case when w.payout_status = 'paid' then now() - interval '12 hours' else null end,
  case when w.payout_status = 'paid' then 'NEFT-DEMO-' || left(w.id::text, 8) else null end
from public.draw_winners w
on conflict (winner_id) do update set
  amount_cents = excluded.amount_cents,
  status = excluded.status,
  paid_at = excluded.paid_at,
  reference = excluded.reference,
  updated_at = now();

commit;
