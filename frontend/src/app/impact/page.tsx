import { createClient } from "@/lib/supabase/server";

export default async function ImpactPage() {
  const supabase = await createClient();

  const [{ data: ledgers }, { data: charityPrefs }, { data: subscriptions }] = await Promise.all([
    supabase
      .from("prize_pool_ledger")
      .select("total_pool_cents, rollover_in_cents, rollover_out_cents")
      .order("created_at", { ascending: false })
      .limit(24),
    supabase.from("user_charity_preferences").select("user_id, charity_id, contribution_percent"),
    supabase
      .from("subscriptions")
      .select("user_id, amount_cents, status, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const totalPrizePool = (ledgers ?? []).reduce((sum, row) => sum + row.total_pool_cents, 0);
  const totalRolloverIn = (ledgers ?? []).reduce((sum, row) => sum + row.rollover_in_cents, 0);
  const totalRolloverOut = (ledgers ?? []).reduce((sum, row) => sum + row.rollover_out_cents, 0);

  const latestSubscriptionByUser = new Map<string, { amount_cents: number; status: string }>();
  (subscriptions ?? []).forEach((sub) => {
    if (!latestSubscriptionByUser.has(sub.user_id)) {
      latestSubscriptionByUser.set(sub.user_id, {
        amount_cents: sub.amount_cents,
        status: sub.status,
      });
    }
  });

  const estimatedCharityContribution = (charityPrefs ?? []).reduce((sum, pref) => {
    const sub = latestSubscriptionByUser.get(pref.user_id);
    if (!sub || sub.status !== "active") return sum;
    return sum + Math.floor(sub.amount_cents * (Number(pref.contribution_percent) / 100));
  }, 0);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 md:px-10 md:py-14">
      <section className="rounded-3xl border border-foreground/10 bg-surface p-8">
        <h1 className="text-4xl">Community Impact</h1>
        <p className="mt-2 text-foreground/70">
          Transparent overview of draw pools, rollover movements, and estimated charity contribution.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-foreground/10 bg-white p-5">
          <p className="text-sm text-foreground/60">Total Prize Pool</p>
          <p className="mt-1 text-3xl font-semibold">Rs {(totalPrizePool / 100).toFixed(2)}</p>
        </article>
        <article className="rounded-2xl border border-foreground/10 bg-white p-5">
          <p className="text-sm text-foreground/60">Rollover In</p>
          <p className="mt-1 text-3xl font-semibold">Rs {(totalRolloverIn / 100).toFixed(2)}</p>
        </article>
        <article className="rounded-2xl border border-foreground/10 bg-white p-5">
          <p className="text-sm text-foreground/60">Estimated Charity Contribution</p>
          <p className="mt-1 text-3xl font-semibold">Rs {(estimatedCharityContribution / 100).toFixed(2)}</p>
          <p className="mt-2 text-xs text-foreground/60">Computed from active subscription amount and user contribution %.</p>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-foreground/10 bg-white p-5">
        <p className="text-sm text-foreground/70">
          Latest rollover out: Rs {(totalRolloverOut / 100).toFixed(2)} across recent draw ledgers.
        </p>
      </section>
    </main>
  );
}
