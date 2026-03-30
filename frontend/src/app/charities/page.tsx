import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

type CharitiesPageProps = {
  searchParams: Promise<{
    q?: string;
    featured?: string;
  }>;
};

export default async function CharitiesPage({ searchParams }: CharitiesPageProps) {
  const { q, featured } = await searchParams;
  const query = (q ?? "").trim();
  const featuredFilter = featured === "featured" ? "featured" : "all";

  const supabase = await createClient();
  let charitiesQuery = supabase
    .from("charities")
    .select("id, slug, name, description, image_url, is_featured, upcoming_events")
    .order("is_featured", { ascending: false })
    .order("name", { ascending: true });

  if (query) {
    charitiesQuery = charitiesQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
  }

  if (featuredFilter === "featured") {
    charitiesQuery = charitiesQuery.eq("is_featured", true);
  }

  const { data: charities } = await charitiesQuery;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 md:px-10 md:py-14">
      <section className="rounded-3xl border border-foreground/10 bg-surface p-8">
        <h1 className="text-4xl">Charity Directory</h1>
        <p className="mt-2 text-foreground/70">Search, filter, and explore organizations supported by your subscription.</p>

        <form className="mt-5 flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search charity by name or impact"
            className="w-full rounded-xl border border-foreground/20 bg-white px-4 py-2"
          />
          <select
            name="featured"
            defaultValue={featuredFilter}
            className="rounded-xl border border-foreground/20 bg-white px-4 py-2"
          >
            <option value="all">All charities</option>
            <option value="featured">Featured only</option>
          </select>
          <button type="submit" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">
            Search
          </button>
        </form>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {(charities ?? []).map((charity) => (
          <article key={charity.id} className="rounded-2xl border border-foreground/10 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl">{charity.name}</h2>
              {charity.is_featured ? (
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-foreground">Featured</span>
              ) : null}
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-foreground/70">{charity.description}</p>
            <p className="mt-3 text-xs text-foreground/60">
              Events: {Array.isArray(charity.upcoming_events) ? charity.upcoming_events.length : 0}
            </p>
            <Link href={`/charities/${charity.slug}`} className="mt-4 inline-block text-sm font-semibold text-brand">
              View profile
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
