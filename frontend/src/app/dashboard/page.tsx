import Link from "next/link";
import { redirect } from "next/navigation";

import { postInternal } from "@/lib/backend";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { createClient } from "@/lib/supabase/server";

type DashboardPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
    billingError?: string;
  }>;
};

async function signOut() {
  "use server";

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function startSubscription(formData: FormData) {
  "use server";

  const userId = String(formData.get("userId") ?? "");
  const planInterval = String(formData.get("planInterval") ?? "monthly");
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

  const response = await fetch(`${apiBaseUrl}/api/billing/create-subscription`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      planInterval,
      totalCount: planInterval === "yearly" ? 1 : 12,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    redirect("/dashboard?billingError=Unable%20to%20start%20subscription");
  }

  const data = (await response.json()) as { shortUrl?: string | null };
  if (!data.shortUrl) {
    redirect("/dashboard?billingError=Checkout%20URL%20not%20available");
  }

  redirect(data.shortUrl);
}

async function addScore(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const score = Number(formData.get("score"));
  const scoreDate = String(formData.get("scoreDate") ?? "");

  if (!Number.isInteger(score) || score < 1 || score > 45 || !scoreDate) {
    redirect("/dashboard?error=Score%20must%20be%20between%201%20and%2045%20with%20a%20valid%20date");
  }

  const { data: latestSubscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestSubscription?.status !== "active") {
    redirect("/dashboard?error=Active%20subscription%20required%20to%20add%20scores");
  }

  const { error } = await supabase.from("score_entries").insert({
    user_id: user.id,
    stableford_score: score,
    score_date: scoreDate,
  });

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard?success=Score%20added");
}

async function updateScore(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const id = String(formData.get("scoreId") ?? "");
  const score = Number(formData.get("score"));
  const scoreDate = String(formData.get("scoreDate") ?? "");

  if (!id || !Number.isInteger(score) || score < 1 || score > 45 || !scoreDate) {
    redirect("/dashboard?error=Invalid%20score%20update%20payload");
  }

  const { error } = await supabase
    .from("score_entries")
    .update({
      stableford_score: score,
      score_date: scoreDate,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard?success=Score%20updated");
}

async function saveCharityPreference(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const charityId = String(formData.get("charityId") ?? "");
  const contributionPercent = Number(formData.get("contributionPercent"));

  if (!charityId || Number.isNaN(contributionPercent) || contributionPercent < 10 || contributionPercent > 100) {
    redirect("/dashboard?error=Contribution%20must%20be%20between%2010%20and%20100");
  }

  const { error } = await supabase.from("user_charity_preferences").upsert(
    {
      user_id: user.id,
      charity_id: charityId,
      contribution_percent: contributionPercent,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard?success=Charity%20preference%20saved");
}

async function updateProfileSettings(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName = String(formData.get("fullName") ?? "").trim();

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName || null })
    .eq("id", user.id);

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard?success=Profile%20settings%20updated");
}

async function submitWinnerProof(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const winnerId = String(formData.get("winnerId") ?? "");
  const proofUrl = String(formData.get("proofUrl") ?? "").trim();
  const proofFile = formData.get("proofFile");

  if (!winnerId) {
    redirect("/dashboard?error=Winner%20is%20required");
  }

  const { data: winner } = await supabase
    .from("draw_winners")
    .select("id")
    .eq("id", winnerId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!winner) {
    redirect("/dashboard?error=Invalid%20winner%20selection");
  }

  let finalProofUrl = proofUrl;
  let proofFileBase64: string | undefined;
  let proofFileExtension: string | undefined;
  let proofMimeType: string | undefined;

  if (proofFile instanceof File && proofFile.size > 0) {
    const bytes = await proofFile.arrayBuffer();
    const ext = proofFile.name.includes(".") ? proofFile.name.split(".").pop() : "png";
    proofFileBase64 = Buffer.from(bytes).toString("base64");
    proofFileExtension = ext;
    proofMimeType = proofFile.type || "application/octet-stream";
  }

  if (!finalProofUrl && !proofFileBase64) {
    redirect("/dashboard?error=Provide%20proof%20URL%20or%20upload%20a%20file");
  }

  const response = await postInternal("/api/internal/winner-proof/upsert", {
    userId: user.id,
    winnerId,
    proofUrl: finalProofUrl,
    proofFileBase64,
    proofFileExtension,
    proofMimeType,
  });

  const data = (await response.json()) as { proofUrl?: string };
  finalProofUrl = data.proofUrl ?? finalProofUrl;

  redirect("/dashboard?success=Winner%20proof%20submitted");
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { error, success, billingError } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfile(user);

  const [{ data: profile }, { data: subscription }, { data: scores }, { data: charities }, { data: charityPref }] =
    await Promise.all([
      supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle(),
      supabase
        .from("subscriptions")
        .select("status, plan_interval, current_period_end")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("score_entries")
        .select("id, stableford_score, score_date, created_at")
        .eq("user_id", user.id)
        .order("score_date", { ascending: false }),
      supabase.from("charities").select("id, name, slug").order("name", { ascending: true }),
      supabase
        .from("user_charity_preferences")
        .select("charity_id, contribution_percent")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const [{ count: drawsEnteredCount }, { data: nextDraw }] = await Promise.all([
    supabase.from("draw_participants").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("draws")
      .select("draw_month")
      .gte("draw_month", new Date().toISOString().slice(0, 10))
      .order("draw_month", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const { data: winners } = await supabase
    .from("draw_winners")
    .select("id, tier, prize_cents, payout_status, draw_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const winnerIds = (winners ?? []).map((w) => w.id);
  const { data: verifications } = winnerIds.length
    ? await supabase
        .from("winner_verifications")
        .select("winner_id, status, review_notes")
        .in("winner_id", winnerIds)
    : { data: [] as { winner_id: string; status: string; review_notes: string | null }[] };

  const verificationByWinner = new Map((verifications ?? []).map((v) => [v.winner_id, v]));

  const winningsTotal = (winners ?? []).reduce((acc, w) => acc + w.prize_cents, 0);

  const activeSub = subscription?.status === "active";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 md:px-10 md:py-14">
      <section className="rounded-3xl border border-foreground/10 bg-surface p-8">
        <h1 className="text-4xl">Subscriber Dashboard</h1>
        <p className="mt-2 text-foreground/70">
          Welcome {profile?.full_name ?? user.email}. Manage subscription, scores, charity allocation, and winnings.
        </p>

        <form action={updateProfileSettings} className="mt-4 flex flex-col gap-2 rounded-xl border border-foreground/10 bg-white p-4 md:flex-row md:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-sm font-semibold text-foreground/75">Full Name</span>
            <input
              type="text"
              name="fullName"
              defaultValue={profile?.full_name ?? ""}
              className="w-full rounded-xl border border-foreground/20 px-3 py-2"
              placeholder="Your full name"
            />
          </label>
          <button type="submit" className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-white">
            Save Profile
          </button>
        </form>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-foreground/10 bg-white p-4">
            <p className="text-sm text-foreground/60">Subscription Status</p>
            <p className="mt-1 text-xl font-semibold capitalize">{subscription?.status ?? "inactive"}</p>
            <p className="mt-1 text-xs text-foreground/60">
              Renewal: {subscription?.current_period_end ? new Date(subscription.current_period_end).toDateString() : "-"}
            </p>
          </article>
          <article className="rounded-2xl border border-foreground/10 bg-white p-4">
            <p className="text-sm text-foreground/60">Plan</p>
            <p className="mt-1 text-xl font-semibold capitalize">{subscription?.plan_interval ?? "not set"}</p>
          </article>
          <article className="rounded-2xl border border-foreground/10 bg-white p-4">
            <p className="text-sm text-foreground/60">Total Winnings</p>
            <p className="mt-1 text-xl font-semibold">Rs {(winningsTotal / 100).toFixed(2)}</p>
          </article>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <form action={startSubscription} className="flex gap-2">
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="planInterval" value="monthly" />
            <button className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-foreground" type="submit">
              Subscribe Monthly
            </button>
          </form>
          <form action={startSubscription} className="flex gap-2">
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="planInterval" value="yearly" />
            <button className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-foreground" type="submit">
              Subscribe Yearly
            </button>
          </form>
          <Link className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white" href="/charities">
            Browse Charities
          </Link>
          <Link className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-white" href="/admin">
            Admin Area
          </Link>
          <form action={signOut}>
            <button className="rounded-xl bg-brand-2 px-4 py-2 text-sm font-semibold text-white" type="submit">
              Sign Out
            </button>
          </form>
        </div>

        {billingError ? (
          <p className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{billingError}</p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}
        {success ? (
          <p className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-foreground/10 bg-surface p-6">
          <h2 className="text-2xl">Score Entry and Edit</h2>
          <p className="mt-1 text-sm text-foreground/70">Latest five scores are retained automatically.</p>

          <form action={addScore} className="mt-4 grid gap-3 md:grid-cols-3">
            <input
              type="number"
              min={1}
              max={45}
              name="score"
              required
              className="rounded-xl border border-foreground/20 bg-white px-3 py-2"
              placeholder="Score (1-45)"
              disabled={!activeSub}
            />
            <input
              type="date"
              name="scoreDate"
              required
              className="rounded-xl border border-foreground/20 bg-white px-3 py-2"
              disabled={!activeSub}
            />
            <button
              type="submit"
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!activeSub}
            >
              Add Score
            </button>
          </form>

          {!activeSub ? (
            <p className="mt-3 text-sm text-amber-700">Activate subscription to enter or edit scores.</p>
          ) : null}

          <div className="mt-4 space-y-3">
            {(scores ?? []).slice(0, 5).map((score) => (
              <form key={score.id} action={updateScore} className="grid gap-2 rounded-xl border border-foreground/10 bg-white p-3 md:grid-cols-4">
                <input type="hidden" name="scoreId" value={score.id} />
                <input
                  type="number"
                  min={1}
                  max={45}
                  name="score"
                  defaultValue={score.stableford_score}
                  required
                  className="rounded-lg border border-foreground/20 bg-white px-3 py-2"
                  disabled={!activeSub}
                />
                <input
                  type="date"
                  name="scoreDate"
                  defaultValue={score.score_date}
                  required
                  className="rounded-lg border border-foreground/20 bg-white px-3 py-2"
                  disabled={!activeSub}
                />
                <p className="self-center text-xs text-foreground/60">{new Date(score.created_at).toLocaleString()}</p>
                <button
                  type="submit"
                  className="rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  disabled={!activeSub}
                >
                  Save
                </button>
              </form>
            ))}
            {scores?.length === 0 ? <p className="text-sm text-foreground/70">No scores yet.</p> : null}
          </div>
        </article>

        <article className="rounded-3xl border border-foreground/10 bg-surface p-6">
          <h2 className="text-2xl">Charity Selection</h2>
          <p className="mt-1 text-sm text-foreground/70">Minimum contribution is 10%.</p>

          <form action={saveCharityPreference} className="mt-4 grid gap-3 md:grid-cols-3">
            <select
              name="charityId"
              required
              defaultValue={charityPref?.charity_id ?? ""}
              className="rounded-xl border border-foreground/20 bg-white px-3 py-2 md:col-span-2"
            >
              <option value="" disabled>
                Select charity
              </option>
              {(charities ?? []).map((charity) => (
                <option key={charity.id} value={charity.id}>
                  {charity.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={10}
              max={100}
              step={0.01}
              name="contributionPercent"
              required
              defaultValue={charityPref?.contribution_percent ?? 10}
              className="rounded-xl border border-foreground/20 bg-white px-3 py-2"
            />
            <button type="submit" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white md:col-span-3">
              Save Charity Preference
            </button>
          </form>

          <h3 className="mt-8 text-xl">Participation and Winnings</h3>
          <p className="mt-1 text-sm text-foreground/70">
            Draws entered: {drawsEnteredCount ?? 0}. Upcoming draw: {nextDraw?.draw_month ?? "monthly cadence"}.
          </p>

          <div className="mt-3 space-y-3">
            {(winners ?? []).map((winner) => {
              const verification = verificationByWinner.get(winner.id);
              return (
                <div key={winner.id} className="rounded-xl border border-foreground/10 bg-white p-3">
                  <p className="text-sm font-semibold">
                    {winner.tier} - Rs {(winner.prize_cents / 100).toFixed(2)} - payout {winner.payout_status}
                  </p>
                  <p className="mt-1 text-xs text-foreground/70">
                    Verification: {verification?.status ?? "not submitted"}
                    {verification?.review_notes ? ` (${verification.review_notes})` : ""}
                  </p>
                  <form action={submitWinnerProof} className="mt-2 flex flex-col gap-2 md:flex-row">
                    <input type="hidden" name="winnerId" value={winner.id} />
                    <input
                      type="url"
                      name="proofUrl"
                      placeholder="Proof screenshot URL"
                      className="w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm"
                    />
                    <input
                      type="file"
                      name="proofFile"
                      accept="image/*"
                      className="w-full rounded-lg border border-foreground/20 px-3 py-2 text-sm md:w-auto"
                    />
                    <button type="submit" className="rounded-lg bg-brand-2 px-3 py-2 text-sm font-semibold text-white">
                      Upload Proof
                    </button>
                  </form>
                </div>
              );
            })}
            {winners?.length === 0 ? <p className="text-sm text-foreground/70">No winnings yet.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
