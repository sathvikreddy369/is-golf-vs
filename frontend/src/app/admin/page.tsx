import Link from "next/link";
import { redirect } from "next/navigation";

import { postInternal } from "@/lib/backend";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return { user, profile };
}

async function createOrUpdateCharity(formData: FormData) {
  "use server";
  await assertAdmin();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const featured = formData.get("featured") === "on";
  const eventsRaw = String(formData.get("events") ?? "").trim();
  const upcomingEvents = eventsRaw
    ? eventsRaw
        .split("\n")
        .map((e) => e.trim())
        .filter(Boolean)
    : [];

  if (!name || !slug || !description) {
    redirect("/admin?error=Name%2C%20slug%2C%20and%20description%20are%20required");
  }

  await postInternal("/api/internal/admin/charity/save", {
    id: id || undefined,
    name,
    slug,
    description,
    imageUrl,
    featured,
    upcomingEvents,
  });

  redirect("/admin?success=Charity%20saved");
}

async function deleteCharity(formData: FormData) {
  "use server";
  await assertAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect("/admin?error=Missing%20charity%20id");
  }

  await postInternal("/api/internal/admin/charity/delete", { id });
  redirect("/admin?success=Charity%20deleted");
}

async function runSimulation(formData: FormData) {
  "use server";
  await assertAdmin();

  const mode = String(formData.get("mode") ?? "random");
  await postInternal("/api/internal/admin/draw/simulate", { mode });

  redirect("/admin?success=Draw%20simulation%20completed");
}

async function publishDraw(formData: FormData) {
  "use server";
  await assertAdmin();

  const drawId = String(formData.get("drawId") ?? "");
  if (!drawId) {
    redirect("/admin?error=Missing%20draw%20id");
  }

  await postInternal("/api/internal/admin/draw/publish", { drawId });
  redirect("/admin?success=Draw%20published");
}

async function reviewVerification(formData: FormData) {
  "use server";

  const { user } = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "pending");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!id || !["approved", "rejected"].includes(status)) {
    redirect("/admin?error=Invalid%20verification%20request");
  }

  await postInternal("/api/internal/admin/verification/review", {
    id,
    status,
    notes,
    reviewerId: user.id,
  });

  redirect("/admin?success=Verification%20updated");
}

async function updateUserRole(formData: FormData) {
  "use server";
  await assertAdmin();

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "subscriber");

  if (!userId || !["subscriber", "admin"].includes(role)) {
    redirect("/admin?error=Invalid%20role%20update");
  }

  await postInternal("/api/internal/admin/user/role", {
    userId,
    role,
  });

  redirect("/admin?success=User%20role%20updated");
}

async function updateSubscriptionStatus(formData: FormData) {
  "use server";
  await assertAdmin();

  const subscriptionId = String(formData.get("subscriptionId") ?? "");
  const status = String(formData.get("status") ?? "inactive");

  if (!subscriptionId || !["inactive", "active", "past_due", "canceled", "lapsed"].includes(status)) {
    redirect("/admin?error=Invalid%20subscription%20status%20update");
  }

  await postInternal("/api/internal/admin/subscription/status", {
    subscriptionId,
    status,
  });

  redirect("/admin?success=Subscription%20status%20updated");
}

async function adminUpdateScore(formData: FormData) {
  "use server";
  await assertAdmin();

  const scoreId = String(formData.get("scoreId") ?? "");
  const score = Number(formData.get("score"));
  const scoreDate = String(formData.get("scoreDate") ?? "");

  if (!scoreId || !Number.isInteger(score) || score < 1 || score > 45 || !scoreDate) {
    redirect("/admin?error=Invalid%20score%20update%20payload");
  }

  await postInternal("/api/internal/admin/score/update", {
    scoreId,
    score,
    scoreDate,
  });

  redirect("/admin?success=Score%20updated");
}

async function markPayout(formData: FormData) {
  "use server";
  await assertAdmin();

  const winnerId = String(formData.get("winnerId") ?? "");
  if (!winnerId) {
    redirect("/admin?error=Missing%20winner%20id");
  }

  await postInternal("/api/internal/admin/payout/mark-paid", { winnerId });
  redirect("/admin?success=Payout%20marked%20as%20paid");
}

type AdminPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { error, success } = await searchParams;
  const { profile, user } = await assertAdmin();

  const adminClient = createAdminClient();

  const [
    { data: charities },
    { data: draws },
    { data: verifications },
    { data: winners },
    { count: usersCount },
    { data: ledgers },
    { data: profiles },
    { data: subscriptions },
    { data: recentScores },
    { data: charityPrefs },
    { count: publishedDrawCount },
    { count: winnersCount },
    { data: analyticsSubscriptions },
  ] = await Promise.all([
    adminClient.from("charities").select("id, name, slug").order("name", { ascending: true }),
    adminClient
      .from("draws")
      .select("id, draw_month, mode, status, winning_numbers")
      .order("draw_month", { ascending: false })
      .limit(6),
    adminClient
      .from("winner_verifications")
      .select("id, status, proof_file_url, review_notes")
      .order("created_at", { ascending: false })
      .limit(12),
    adminClient
      .from("draw_winners")
      .select("id, tier, prize_cents, payout_status")
      .order("created_at", { ascending: false })
      .limit(20),
    adminClient.from("profiles").select("id", { count: "exact", head: true }),
    adminClient
      .from("prize_pool_ledger")
      .select("total_pool_cents, rollover_out_cents")
      .order("created_at", { ascending: false })
      .limit(12),
    adminClient.from("profiles").select("id, full_name, role").order("created_at", { ascending: false }).limit(20),
    adminClient
      .from("subscriptions")
      .select("id, user_id, status, plan_interval, current_period_end")
      .order("created_at", { ascending: false })
      .limit(20),
    adminClient
      .from("score_entries")
      .select("id, user_id, stableford_score, score_date")
      .order("created_at", { ascending: false })
      .limit(20),
    adminClient.from("user_charity_preferences").select("user_id, charity_id, contribution_percent"),
    adminClient.from("draws").select("id", { count: "exact", head: true }).eq("status", "published"),
    adminClient.from("draw_winners").select("id", { count: "exact", head: true }),
    adminClient
      .from("subscriptions")
      .select("user_id, amount_cents, status, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const totalPrizePool = (ledgers ?? []).reduce((acc, l) => acc + l.total_pool_cents, 0);
  const totalRollover = (ledgers ?? []).reduce((acc, l) => acc + l.rollover_out_cents, 0);
  const avgContributionPercent = charityPrefs?.length
    ? charityPrefs.reduce((acc, pref) => acc + Number(pref.contribution_percent), 0) / charityPrefs.length
    : 0;

  const latestSubscriptionByUser = new Map<string, { amount_cents: number; status: string }>();
  (analyticsSubscriptions ?? []).forEach((sub) => {
    if (!latestSubscriptionByUser.has(sub.user_id)) {
      latestSubscriptionByUser.set(sub.user_id, {
        amount_cents: sub.amount_cents,
        status: sub.status,
      });
    }
  });

  let totalCharityContributionCents = 0;
  const charityContributionById = new Map<string, number>();

  (charityPrefs ?? []).forEach((pref) => {
    const latestSub = latestSubscriptionByUser.get(pref.user_id);
    if (!latestSub || latestSub.status !== "active") {
      return;
    }

    const contribution = Math.floor(latestSub.amount_cents * (Number(pref.contribution_percent) / 100));
    totalCharityContributionCents += contribution;
    charityContributionById.set(pref.charity_id, (charityContributionById.get(pref.charity_id) ?? 0) + contribution);
  });

  const charityContributionRows = (charities ?? [])
    .map((charity) => ({
      id: charity.id,
      name: charity.name,
      contributionCents: charityContributionById.get(charity.id) ?? 0,
    }))
    .filter((row) => row.contributionCents > 0)
    .sort((a, b) => b.contributionCents - a.contributionCents)
    .slice(0, 8);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-10 md:px-10 md:py-14">
      <section className="rounded-3xl border border-foreground/10 bg-surface p-8">
        <h1 className="text-4xl">Admin Dashboard</h1>
        <p className="mt-2 text-foreground/70">
          Welcome {profile?.full_name ?? user.email}. Manage users, draws, charities, winner verification, and payouts.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-4 xl:grid-cols-7">
          <article className="rounded-xl border border-foreground/10 bg-white p-4">
            <p className="text-sm text-foreground/60">Total Users</p>
            <p className="text-2xl font-semibold">{usersCount ?? 0}</p>
          </article>
          <article className="rounded-xl border border-foreground/10 bg-white p-4">
            <p className="text-sm text-foreground/60">Total Prize Pool</p>
            <p className="text-2xl font-semibold">Rs {(totalPrizePool / 100).toFixed(2)}</p>
          </article>
          <article className="rounded-xl border border-foreground/10 bg-white p-4">
            <p className="text-sm text-foreground/60">Rollover Total</p>
            <p className="text-2xl font-semibold">Rs {(totalRollover / 100).toFixed(2)}</p>
          </article>
          <article className="rounded-xl border border-foreground/10 bg-white p-4">
            <p className="text-sm text-foreground/60">Recent Draws</p>
            <p className="text-2xl font-semibold">{draws?.length ?? 0}</p>
          </article>
          <article className="rounded-xl border border-foreground/10 bg-white p-4">
            <p className="text-sm text-foreground/60">Avg Charity %</p>
            <p className="text-2xl font-semibold">{avgContributionPercent.toFixed(2)}%</p>
          </article>
          <article className="rounded-xl border border-foreground/10 bg-white p-4">
            <p className="text-sm text-foreground/60">Published Draws</p>
            <p className="text-2xl font-semibold">{publishedDrawCount ?? 0}</p>
          </article>
          <article className="rounded-xl border border-foreground/10 bg-white p-4">
            <p className="text-sm text-foreground/60">Total Winners</p>
            <p className="text-2xl font-semibold">{winnersCount ?? 0}</p>
          </article>
          <article className="rounded-xl border border-foreground/10 bg-white p-4">
            <p className="text-sm text-foreground/60">Charity Contribution Total</p>
            <p className="text-2xl font-semibold">Rs {(totalCharityContributionCents / 100).toFixed(2)}</p>
          </article>
        </div>

        <div className="mt-5 flex gap-3">
          <Link className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white" href="/dashboard">
            Subscriber Dashboard
          </Link>
          <Link className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-white" href="/charities">
            Public Charities Page
          </Link>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}
        {success ? (
          <p className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>
        ) : null}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-foreground/10 bg-surface p-6">
          <h2 className="text-2xl">Draw Management</h2>
          <div className="mt-4 flex gap-3">
            <form action={runSimulation}>
              <input type="hidden" name="mode" value="random" />
              <button className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white" type="submit">
                Simulate Random Draw
              </button>
            </form>
            <form action={runSimulation}>
              <input type="hidden" name="mode" value="weighted" />
              <button className="rounded-xl bg-brand-2 px-4 py-2 text-sm font-semibold text-white" type="submit">
                Simulate Weighted Draw
              </button>
            </form>
          </div>

          <div className="mt-4 space-y-3">
            {(draws ?? []).map((draw) => (
              <div key={draw.id} className="rounded-xl border border-foreground/10 bg-white p-3">
                <p className="text-sm font-semibold">
                  {draw.draw_month} - {draw.mode} - {draw.status}
                </p>
                <p className="mt-1 text-xs text-foreground/70">Winning numbers: {draw.winning_numbers.join(", ")}</p>
                {draw.status !== "published" ? (
                  <form action={publishDraw} className="mt-2">
                    <input type="hidden" name="drawId" value={draw.id} />
                    <button className="rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-white" type="submit">
                      Publish Draw
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-foreground/10 bg-surface p-6">
          <h2 className="text-2xl">Charity Management</h2>
          <form action={createOrUpdateCharity} className="mt-4 grid gap-3">
            <input name="name" placeholder="Name" className="rounded-xl border border-foreground/20 bg-white px-3 py-2" required />
            <input name="slug" placeholder="slug" className="rounded-xl border border-foreground/20 bg-white px-3 py-2" required />
            <textarea name="description" placeholder="Description" className="rounded-xl border border-foreground/20 bg-white px-3 py-2" rows={3} required />
            <input name="imageUrl" placeholder="Image URL" className="rounded-xl border border-foreground/20 bg-white px-3 py-2" />
            <textarea name="events" placeholder="One event per line" className="rounded-xl border border-foreground/20 bg-white px-3 py-2" rows={3} />
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="featured" /> Featured
            </label>
            <button className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white" type="submit">
              Save Charity
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {(charities ?? []).map((charity) => (
              <div key={charity.id} className="flex items-center justify-between gap-2 rounded-xl border border-foreground/10 bg-white px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">{charity.name}</p>
                  <p className="text-xs text-foreground/60">/{charity.slug}</p>
                </div>
                <form action={deleteCharity}>
                  <input type="hidden" name="id" value={charity.id} />
                  <button className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white" type="submit">
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-3xl border border-foreground/10 bg-surface p-6">
        <h2 className="text-2xl">Charity Contribution Totals</h2>
        <p className="mt-1 text-sm text-foreground/70">
          Estimated from active subscriptions and each user selected contribution percentage.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {charityContributionRows.map((row) => (
            <div key={row.id} className="rounded-xl border border-foreground/10 bg-white p-3">
              <p className="text-sm font-semibold">{row.name}</p>
              <p className="mt-1 text-xs text-foreground/60">Estimated contribution</p>
              <p className="text-lg font-semibold">Rs {(row.contributionCents / 100).toFixed(2)}</p>
            </div>
          ))}
          {charityContributionRows.length === 0 ? (
            <p className="text-sm text-foreground/70">No charity contribution data available yet.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-foreground/10 bg-surface p-6">
          <h2 className="text-2xl">Winner Verification</h2>
          <div className="mt-4 space-y-3">
            {(verifications ?? []).map((verification) => (
              <div key={verification.id} className="rounded-xl border border-foreground/10 bg-white p-3">
                <p className="text-sm font-semibold">Verification {verification.status}</p>
                <a href={verification.proof_file_url} target="_blank" rel="noreferrer" className="text-xs text-brand">
                  View proof
                </a>
                <form action={reviewVerification} className="mt-2 flex flex-col gap-2">
                  <input type="hidden" name="id" value={verification.id} />
                  <select name="status" className="rounded-lg border border-foreground/20 px-3 py-2 text-sm" defaultValue={verification.status}>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                  </select>
                  <input name="notes" defaultValue={verification.review_notes ?? ""} placeholder="Review notes" className="rounded-lg border border-foreground/20 px-3 py-2 text-sm" />
                  <button className="rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-white" type="submit">
                    Save Review
                  </button>
                </form>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-foreground/10 bg-surface p-6">
          <h2 className="text-2xl">Payout Tracking</h2>
          <div className="mt-4 space-y-3">
            {(winners ?? []).map((winner) => (
              <div key={winner.id} className="rounded-xl border border-foreground/10 bg-white p-3">
                <p className="text-sm font-semibold">
                  {winner.tier} - Rs {(winner.prize_cents / 100).toFixed(2)} - {winner.payout_status}
                </p>
                {winner.payout_status !== "paid" ? (
                  <form action={markPayout} className="mt-2">
                    <input type="hidden" name="winnerId" value={winner.id} />
                    <button className="rounded-lg bg-brand-2 px-3 py-2 text-xs font-semibold text-white" type="submit">
                      Mark Paid
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <article className="rounded-3xl border border-foreground/10 bg-surface p-6">
          <h2 className="text-2xl">User Management</h2>
          <div className="mt-4 space-y-3">
            {(profiles ?? []).map((p) => (
              <form key={p.id} action={updateUserRole} className="rounded-xl border border-foreground/10 bg-white p-3">
                <input type="hidden" name="userId" value={p.id} />
                <p className="text-sm font-semibold">{p.full_name ?? p.id}</p>
                <div className="mt-2 flex gap-2">
                  <select name="role" defaultValue={p.role} className="rounded-lg border border-foreground/20 px-3 py-2 text-sm">
                    <option value="subscriber">subscriber</option>
                    <option value="admin">admin</option>
                  </select>
                  <button type="submit" className="rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-white">Save Role</button>
                </div>
              </form>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-foreground/10 bg-surface p-6">
          <h2 className="text-2xl">Subscription Management</h2>
          <div className="mt-4 space-y-3">
            {(subscriptions ?? []).map((sub) => (
              <form key={sub.id} action={updateSubscriptionStatus} className="rounded-xl border border-foreground/10 bg-white p-3">
                <input type="hidden" name="subscriptionId" value={sub.id} />
                <p className="text-sm font-semibold">{sub.user_id.slice(0, 8)}... - {sub.plan_interval}</p>
                <p className="text-xs text-foreground/60">Renewal: {sub.current_period_end ? new Date(sub.current_period_end).toDateString() : "-"}</p>
                <div className="mt-2 flex gap-2">
                  <select name="status" defaultValue={sub.status} className="rounded-lg border border-foreground/20 px-3 py-2 text-sm">
                    <option value="inactive">inactive</option>
                    <option value="active">active</option>
                    <option value="past_due">past_due</option>
                    <option value="canceled">canceled</option>
                    <option value="lapsed">lapsed</option>
                  </select>
                  <button type="submit" className="rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-white">Save Status</button>
                </div>
              </form>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-foreground/10 bg-surface p-6">
          <h2 className="text-2xl">Score Management</h2>
          <div className="mt-4 space-y-3">
            {(recentScores ?? []).map((score) => (
              <form key={score.id} action={adminUpdateScore} className="rounded-xl border border-foreground/10 bg-white p-3">
                <input type="hidden" name="scoreId" value={score.id} />
                <p className="text-xs text-foreground/60">User: {score.user_id.slice(0, 8)}...</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <input type="number" min={1} max={45} name="score" defaultValue={score.stableford_score} className="rounded-lg border border-foreground/20 px-2 py-1 text-sm" />
                  <input type="date" name="scoreDate" defaultValue={score.score_date} className="rounded-lg border border-foreground/20 px-2 py-1 text-sm" />
                  <button type="submit" className="rounded-lg bg-foreground px-2 py-1 text-xs font-semibold text-white">Save</button>
                </div>
              </form>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
