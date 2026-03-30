import Link from "next/link";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type CharityProfilePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CharityProfilePage({ params }: CharityProfilePageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: charity } = await supabase
    .from("charities")
    .select("name, slug, description, image_url, upcoming_events, is_featured")
    .eq("slug", slug)
    .maybeSingle();

  if (!charity) {
    notFound();
  }

  const charityName = charity.name;

  const events = Array.isArray(charity.upcoming_events) ? charity.upcoming_events : [];

  async function startIndependentDonation(formData: FormData) {
    "use server";

    const amountInr = Number(formData.get("amountInr") ?? 0);
    if (!amountInr || amountInr <= 0) {
      redirect(`/charities/${slug}`);
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(`/login?next=${encodeURIComponent(`/charities/${slug}`)}`);
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
    const response = await fetch(`${apiBaseUrl}/api/charity/create-donation-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: user.id,
        charityName,
        amountCents: Math.round(amountInr * 100),
        email: user.email ?? undefined,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      redirect(`/charities/${slug}`);
    }

    const data = (await response.json()) as { shortUrl?: string };
    if (!data.shortUrl) {
      redirect(`/charities/${slug}`);
    }

    redirect(data.shortUrl);
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-10 md:px-10 md:py-14">
      <section className="rounded-3xl border border-foreground/10 bg-surface p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Charity Profile</p>
        <h1 className="mt-2 text-4xl">{charity.name}</h1>
        {charity.is_featured ? (
          <p className="mt-2 inline-flex rounded-full bg-accent px-3 py-1 text-xs font-semibold text-foreground">Featured spotlight</p>
        ) : null}
        <p className="mt-4 whitespace-pre-wrap text-foreground/80">{charity.description}</p>

        <h2 className="mt-8 text-2xl">Upcoming Events</h2>
        <div className="mt-3 space-y-3">
          {events.length > 0 ? (
            events.map((event, index) => (
              <div key={index} className="rounded-xl border border-foreground/10 bg-white p-3 text-sm text-foreground/80">
                {typeof event === "string" ? event : JSON.stringify(event)}
              </div>
            ))
          ) : (
            <p className="text-sm text-foreground/70">No listed events yet.</p>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <Link href="/charities" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">
            Back to directory
          </Link>
          <Link href="/dashboard" className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-white">
            Go to dashboard
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-foreground/10 bg-white p-4">
          <h3 className="text-xl">Independent Donation</h3>
          <p className="mt-1 text-sm text-foreground/70">Donate directly without draw participation.</p>
          <form action={startIndependentDonation} className="mt-3 flex flex-col gap-3 md:flex-row">
            <input
              type="number"
              min={1}
              step={1}
              name="amountInr"
              defaultValue={500}
              className="rounded-lg border border-foreground/20 px-3 py-2"
            />
            <button type="submit" className="rounded-lg bg-brand-2 px-4 py-2 text-sm font-semibold text-white">
              Donate via Razorpay
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
