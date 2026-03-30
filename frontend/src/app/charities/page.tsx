import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

type CharitiesPageProps = {
  searchParams: Promise<{
    q?: string;
    featured?: string;
    hasEvents?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 12;

function toPage(raw: string | undefined) {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

function likeValue(query: string) {
  return query.replace(/[%_]/g, "").trim();
}

export default async function CharitiesPage({ searchParams }: CharitiesPageProps) {
  const { q, featured, hasEvents, page } = await searchParams;
  const query = (q ?? "").trim();
  const featuredFilter = featured === "featured" ? "featured" : "all";
  const hasEventsFilter = hasEvents === "yes" ? "yes" : "all";
  const pageNumber = toPage(page);
  const start = (pageNumber - 1) * PAGE_SIZE;

  const supabase = await createClient();
  let charitiesQuery = supabase
    .from("charities")
    .select("id, slug, name, description, image_url, is_featured, upcoming_events", { count: "exact" })
    .order("is_featured", { ascending: false })
    .order("name", { ascending: true })
    .range(start, start + PAGE_SIZE - 1);

  if (query) {
    const safe = likeValue(query);
    charitiesQuery = charitiesQuery.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`);
  }

  if (featuredFilter === "featured") {
    charitiesQuery = charitiesQuery.eq("is_featured", true);
  }

  if (hasEventsFilter === "yes") {
    charitiesQuery = charitiesQuery.not("upcoming_events", "eq", "{}");
  }

  const { data: charities, count } = await charitiesQuery;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const queryParams = new URLSearchParams();
  if (query) queryParams.set("q", query);
  if (featuredFilter !== "all") queryParams.set("featured", featuredFilter);
  if (hasEventsFilter !== "all") queryParams.set("hasEvents", hasEventsFilter);
  const hrefForPage = (nextPage: number) => {
    const next = new URLSearchParams(queryParams);
    next.set("page", String(nextPage));
    return `/charities?${next.toString()}`;
  };

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
          <select
            name="hasEvents"
            defaultValue={hasEventsFilter}
            className="rounded-xl border border-foreground/20 bg-white px-4 py-2"
          >
            <option value="all">Any event state</option>
            <option value="yes">Has upcoming events</option>
          </select>
          <button type="submit" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">
            Search
          </button>
        </form>
        <p className="mt-3 text-xs text-foreground/65">
          Showing {(charities ?? []).length} of {count ?? 0} charities.
        </p>
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
        {(charities ?? []).length === 0 ? <p className="text-sm text-foreground/70">No charities match this filter.</p> : null}
      </section>

      <section className="mt-6 flex items-center justify-between text-sm text-foreground/70">
        <p>
          Page {pageNumber} of {totalPages}
        </p>
        <div className="flex gap-2">
          {pageNumber > 1 ? (
            <Link className="rounded-lg border border-foreground/20 px-3 py-1" href={hrefForPage(pageNumber - 1)}>
              Previous
            </Link>
          ) : null}
          {pageNumber < totalPages ? (
            <Link className="rounded-lg border border-foreground/20 px-3 py-1" href={hrefForPage(pageNumber + 1)}>
              Next
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
