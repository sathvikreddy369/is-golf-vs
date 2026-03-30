import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: featuredCharities } = await supabase
    .from("charities")
    .select("id, slug, name, description")
    .eq("is_featured", true)
    .order("name", { ascending: true })
    .limit(3);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 md:px-10 md:py-14">
      <section className="rounded-3xl border border-brand/20 bg-surface p-8 shadow-[0_20px_65px_rgba(13,23,40,0.08)] md:p-12">
        <p className="mb-4 inline-flex rounded-full bg-brand/10 px-4 py-1 text-sm font-semibold text-brand">
          PRD v1 Foundation Ready
        </p>
        <h1 className="max-w-3xl text-4xl leading-tight text-foreground md:text-6xl">
          Golf performance, monthly draws, and charity impact in one subscription platform.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-foreground/75">
          This starter now reflects the assignment scope: multi-role product, subscription lifecycle, score tracking,
          draw engine, prize pools, charity contributions, and winner verification workflows.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <span className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white">Next.js 16</span>
          <span className="rounded-full bg-brand-2 px-4 py-2 text-sm font-semibold text-white">TypeScript</span>
          <span className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-white">Supabase</span>
          <span className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-foreground">Razorpay</span>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">
            Login / Signup
          </Link>
          <Link href="/dashboard" className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-white">
            Subscriber Dashboard
          </Link>
          <Link href="/charities" className="rounded-xl bg-brand-2 px-4 py-2 text-sm font-semibold text-white">
            Explore Charities
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-foreground/10 bg-surface-alt p-6">
          <h2 className="text-2xl">Subscriber Experience</h2>
          <p className="mt-2 text-foreground/75">
            Signup, plan purchase, score entry with 5-score rolling limit, draw participation, and winnings history.
          </p>
        </article>
        <article className="rounded-2xl border border-foreground/10 bg-surface-alt p-6">
          <h2 className="text-2xl">Admin Control Tower</h2>
          <p className="mt-2 text-foreground/75">
            Manage users, subscriptions, charity listings, draw simulations, winner verification, and payout tracking.
          </p>
        </article>
        <article className="rounded-2xl border border-foreground/10 bg-surface-alt p-6">
          <h2 className="text-2xl">Financial Integrity</h2>
          <p className="mt-2 text-foreground/75">
            Deterministic prize splits, jackpot rollover logic, charity contribution accounting, and auditable ledgers.
          </p>
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
        <h2 className="text-3xl">Next Build Steps</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-foreground/80">
          <li>Wire Supabase auth, role-based access, and profile bootstrap.</li>
          <li>Implement Razorpay checkout and subscription webhook processing.</li>
          <li>Build score module with validations and latest-5 retention behavior.</li>
          <li>Create draw engine service and monthly simulation/publish flow.</li>
          <li>Ship user and admin dashboards with complete v1 workflows.</li>
        </ol>
      </section>
    </main>
  );
}
