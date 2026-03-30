import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: featuredCharities },
    { data: recentPublishedDraws },
    { count: charitiesCount },
    { count: publishedDrawCount },
    { data: upcomingDraw },
  ] = await Promise.all([
    supabase
      .from("charities")
      .select("id, slug, name, description")
      .eq("is_featured", true)
      .order("name", { ascending: true })
      .limit(3),
    supabase
      .from("draws")
      .select("id, draw_month, mode, winning_numbers, published_at")
      .eq("status", "published")
      .order("draw_month", { ascending: false })
      .limit(3),
    supabase.from("charities").select("id", { count: "exact", head: true }),
    supabase.from("draws").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase
      .from("draws")
      .select("draw_month")
      .gte("draw_month", new Date().toISOString().slice(0, 10))
      .order("draw_month", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 md:px-10 md:py-14">
      <section className="rounded-3xl border border-brand/20 bg-surface p-8 shadow-[0_20px_65px_rgba(13,23,40,0.08)] md:p-12">
        <p className="mb-4 inline-flex rounded-full bg-brand/10 px-4 py-1 text-sm font-semibold text-brand">
          Live v1 Platform
        </p>
        <h1 className="max-w-3xl text-4xl leading-tight text-foreground md:text-6xl">
          Golf performance, monthly draws, and charity impact in one subscription platform.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-foreground/75">
          Track your latest Stableford scores, join monthly draws, support your chosen charity, and manage verification
          and payouts through dedicated subscriber and admin workflows.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <span className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white">Next.js 16</span>
          <span className="rounded-full bg-brand-2 px-4 py-2 text-sm font-semibold text-white">TypeScript</span>
          <span className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-white">Supabase</span>
          <span className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-foreground">Razorpay</span>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={user ? "/dashboard" : "/login"} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">
            {user ? "Open Dashboard" : "Login / Signup"}
          </Link>
          <Link href="/dashboard" className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-white">
            Subscriber Dashboard
          </Link>
          <Link href="/charities" className="rounded-xl bg-brand-2 px-4 py-2 text-sm font-semibold text-white">
            Explore Charities
          </Link>
          <Link href="/draws" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-foreground">
            View Draw Results
          </Link>
          <Link href="/impact" className="rounded-xl border border-foreground/20 px-4 py-2 text-sm font-semibold text-foreground">
            Community Impact
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-foreground/10 bg-surface-alt p-6">
          <p className="text-sm text-foreground/60">Published Draws</p>
          <h2 className="mt-1 text-3xl font-semibold">{publishedDrawCount ?? 0}</h2>
          <p className="mt-2 text-foreground/75">Completed monthly draw announcements available to subscribers.</p>
        </article>
        <article className="rounded-2xl border border-foreground/10 bg-surface-alt p-6">
          <p className="text-sm text-foreground/60">Charities</p>
          <h2 className="mt-1 text-3xl font-semibold">{charitiesCount ?? 0}</h2>
          <p className="mt-2 text-foreground/75">Browse causes, pick contribution percentages, and track impact.</p>
        </article>
        <article className="rounded-2xl border border-foreground/10 bg-surface-alt p-6">
          <p className="text-sm text-foreground/60">Next Scheduled Draw</p>
          <h2 className="mt-1 text-2xl font-semibold">
            {upcomingDraw?.draw_month ? new Date(upcomingDraw.draw_month).toDateString() : "Not Scheduled"}
          </h2>
          <p className="mt-2 text-foreground/75">Admins can simulate and publish random or weighted draw outcomes.</p>
        </article>
      </section>

      <section className="mt-8 rounded-2xl border border-foreground/10 bg-surface p-6 md:p-8">
        <h2 className="text-3xl">How Monthly Draws Work</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6 text-foreground/80">
          <li>Subscribers enter and maintain their latest 5 Stableford scores.</li>
          <li>Admin simulates random or weighted draw numbers each month.</li>
          <li>3, 4, and 5-match tiers distribute 25%, 35%, and 40% prize pools.</li>
          <li>Unclaimed 5-match prize rolls to the next month as jackpot.</li>
        </ol>
      </section>

      <section className="mt-8 rounded-2xl border border-foreground/10 bg-surface p-6 md:p-8">
        <h2 className="text-3xl">Recent Published Draws</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(recentPublishedDraws ?? []).map((draw) => (
            <article key={draw.id} className="rounded-xl border border-foreground/10 bg-white p-4">
              <p className="text-sm text-foreground/60">{draw.draw_month}</p>
              <p className="mt-1 text-sm font-semibold capitalize">Mode: {draw.mode}</p>
              <p className="mt-1 text-sm text-foreground/75">Winning numbers: {draw.winning_numbers.join(", ")}</p>
            </article>
          ))}
          {(recentPublishedDraws ?? []).length === 0 ? (
            <p className="text-sm text-foreground/70">No draw has been published yet.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-foreground/10 bg-surface-alt p-6 md:p-8">
        <h2 className="text-3xl">Featured Charity Spotlight</h2>
        <p className="mt-2 text-foreground/75">Support impact-first causes highlighted by the community.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {(featuredCharities ?? []).map((charity) => (
            <article key={charity.id} className="rounded-xl border border-foreground/10 bg-white p-4">
              <h3 className="text-xl">{charity.name}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-foreground/70">{charity.description}</p>
              <Link href={`/charities/${charity.slug}`} className="mt-3 inline-block text-sm font-semibold text-brand">
                View charity
              </Link>
            </article>
          ))}
          {(featuredCharities ?? []).length === 0 ? (
            <p className="text-sm text-foreground/70">No featured charity yet. Admin can mark one from dashboard.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-dashed border-foreground/25 p-6 md:p-8">
        <h2 className="text-3xl">Get Started</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-foreground/80">
          <li>Create your account and confirm your email.</li>
          <li>Select your charity and contribution percentage.</li>
          <li>Activate your subscription plan from the dashboard.</li>
          <li>Add stableford scores and enter monthly draws.</li>
          <li>Track winnings, proof verification, and payout updates.</li>
        </ol>
      </section>
    </main>
  );
}
