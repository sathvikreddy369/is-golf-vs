import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export default async function DrawsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: draws }, { data: recentWinners }] = await Promise.all([
    supabase
      .from("draws")
      .select("id, draw_month, mode, status, winning_numbers, published_at")
      .order("draw_month", { ascending: false })
      .limit(12),
    supabase
      .from("draw_winners")
      .select("id, draw_id, tier, prize_cents, created_at")
      .eq("user_id", user?.id ?? "00000000-0000-0000-0000-000000000000")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const winnerByDraw = new Map((recentWinners ?? []).map((w) => [w.draw_id, w]));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 md:px-10 md:py-14">
      <section className="rounded-3xl border border-foreground/10 bg-surface p-8">
        <h1 className="text-4xl">Monthly Draw Results</h1>
        <p className="mt-2 text-foreground/70">
          Explore simulated and published draws, winning numbers, and your personal outcomes.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {(draws ?? []).map((draw) => {
          const myWinner = winnerByDraw.get(draw.id);
          return (
            <article key={draw.id} className="rounded-2xl border border-foreground/10 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl">{new Date(draw.draw_month).toLocaleDateString()}</h2>
                <span className="rounded-full bg-surface-alt px-3 py-1 text-xs font-semibold capitalize">
                  {draw.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-foreground/70 capitalize">Mode: {draw.mode}</p>
              <p className="mt-2 text-sm text-foreground/80">Winning numbers: {draw.winning_numbers.join(", ")}</p>
              <p className="mt-2 text-xs text-foreground/60">
                Published: {draw.published_at ? new Date(draw.published_at).toLocaleString() : "Not yet"}
              </p>

              {myWinner ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-sm font-semibold text-emerald-800">You won this draw</p>
                  <p className="text-sm text-emerald-700">
                    Tier: {myWinner.tier}, Prize: Rs {(myWinner.prize_cents / 100).toFixed(2)}
                  </p>
                </div>
              ) : null}
            </article>
          );
        })}

        {(draws ?? []).length === 0 ? (
          <p className="text-sm text-foreground/70">No draw data available yet.</p>
        ) : null}
      </section>

      <div className="mt-8">
        <Link href="/dashboard" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}
