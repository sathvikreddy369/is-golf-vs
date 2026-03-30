-- Validation pack for seeded Golf Charity Platform data.
-- Run after schema + seed scripts.

-- 1) Core row counts
select 'profiles' as table_name, count(*) as row_count from public.profiles
union all
select 'subscriptions', count(*) from public.subscriptions
union all
select 'charities', count(*) from public.charities
union all
select 'user_charity_preferences', count(*) from public.user_charity_preferences
union all
select 'score_entries', count(*) from public.score_entries
union all
select 'draws', count(*) from public.draws
union all
select 'draw_participants', count(*) from public.draw_participants
union all
select 'draw_winners', count(*) from public.draw_winners
union all
select 'winner_verifications', count(*) from public.winner_verifications
union all
select 'payout_transactions', count(*) from public.payout_transactions
union all
select 'prize_pool_ledger', count(*) from public.prize_pool_ledger
order by table_name;

-- 2) Role distribution
select role, count(*) as users
from public.profiles
group by role
order by role;

-- 3) Subscription status distribution
select status, count(*) as subscriptions
from public.subscriptions
group by status
order by status;

-- 4) Draw status and mode mix
select status, mode, count(*) as draws
from public.draws
group by status, mode
order by status, mode;

-- 5) Winner tiers and payout statuses
select tier, payout_status, count(*) as winners
from public.draw_winners
group by tier, payout_status
order by tier, payout_status;

-- 6) Verification moderation outcomes
select status, count(*) as verifications
from public.winner_verifications
group by status
order by status;

-- 7) Charity contribution percentages sanity
select
  min(contribution_percent) as min_contribution_percent,
  max(contribution_percent) as max_contribution_percent,
  avg(contribution_percent) as avg_contribution_percent
from public.user_charity_preferences;

-- 8) Latest 5 score retention check (should return zero rows)
select user_id, count(*) as score_rows
from public.score_entries
group by user_id
having count(*) > 5;

-- 9) Published draw summary with participant/winner counts
select
  d.draw_month,
  d.status,
  d.mode,
  coalesce(dp.participants, 0) as participants,
  coalesce(dw.winners, 0) as winners
from public.draws d
left join (
  select draw_id, count(*) as participants
  from public.draw_participants
  group by draw_id
) dp on dp.draw_id = d.id
left join (
  select draw_id, count(*) as winners
  from public.draw_winners
  group by draw_id
) dw on dw.draw_id = d.id
order by d.draw_month desc;
