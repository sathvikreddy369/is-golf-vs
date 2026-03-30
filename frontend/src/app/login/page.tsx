import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { postInternal } from "@/lib/backend";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
    next?: string;
  }>;
};

async function signIn(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Email and password are required")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureProfile(user);
  }

  redirect(next.startsWith("/") ? next : "/dashboard");
}

async function signUp(formData: FormData) {
  "use server";

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const charityId = String(formData.get("charityId") ?? "").trim();
  const contributionPercent = Number(formData.get("contributionPercent") ?? 10);

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Email and password are required")}`);
  }

  if (charityId && (Number.isNaN(contributionPercent) || contributionPercent < 10 || contributionPercent > 100)) {
    redirect(`/login?error=${encodeURIComponent("Charity contribution must be between 10 and 100")}`);
  }

  const headerStore = await headers();
  const origin =
    headerStore.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user && charityId) {
    await postInternal("/api/internal/user-charity-preference/upsert", {
      userId: data.user.id,
      charityId,
      contributionPercent,
    });
  }

  if (data.user && data.session) {
    await ensureProfile(data.user);
    redirect("/dashboard");
  }

  redirect(
    `/login?success=${encodeURIComponent("Signup successful. Check your email for a confirmation link.")}`,
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, success, next } = await searchParams;
  const supabase = await createClient();
  const { data: charities } = await supabase.from("charities").select("id, name").order("name", { ascending: true });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 md:px-10 md:py-14">
      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-3xl border border-foreground/10 bg-surface p-6 md:p-8">
          <h1 className="text-4xl">Welcome Back</h1>
          <p className="mt-2 text-foreground/70">
            Sign in to continue with scores, draws, and charity participation.
          </p>

          <form action={signIn} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={next ?? "/dashboard"} />
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-foreground/80">Email</span>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-foreground/20 bg-white px-4 py-3"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-foreground/80">Password</span>
              <input
                name="password"
                type="password"
                required
                className="w-full rounded-xl border border-foreground/20 bg-white px-4 py-3"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white"
            >
              Sign In
            </button>
          </form>
        </article>

        <article className="rounded-3xl border border-foreground/10 bg-surface p-6 md:p-8">
          <h2 className="text-3xl">Create Subscriber Account</h2>
          <p className="mt-2 text-foreground/70">Register to start your subscription journey.</p>

          <form action={signUp} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-foreground/80">Full Name</span>
              <input
                name="fullName"
                type="text"
                className="w-full rounded-xl border border-foreground/20 bg-white px-4 py-3"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-foreground/80">Email</span>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-foreground/20 bg-white px-4 py-3"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-foreground/80">Password</span>
              <input
                name="password"
                type="password"
                minLength={8}
                required
                className="w-full rounded-xl border border-foreground/20 bg-white px-4 py-3"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-foreground/80">Select Charity</span>
              <select
                name="charityId"
                defaultValue=""
                className="w-full rounded-xl border border-foreground/20 bg-white px-4 py-3"
              >
                <option value="">Choose later in dashboard</option>
                {(charities ?? []).map((charity) => (
                  <option key={charity.id} value={charity.id}>
                    {charity.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-foreground/80">Charity Contribution % (min 10)</span>
              <input
                name="contributionPercent"
                type="number"
                min={10}
                max={100}
                step={0.01}
                defaultValue={10}
                className="w-full rounded-xl border border-foreground/20 bg-white px-4 py-3"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-brand-2 px-4 py-3 text-sm font-semibold text-white"
            >
              Sign Up
            </button>
          </form>

          <p className="mt-6 text-sm text-foreground/70">
            Back to homepage: <Link href="/" className="font-semibold text-brand">Explore platform</Link>
          </p>
        </article>
      </section>

      {error ? (
        <p className="mt-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}
      {success ? (
        <p className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}
    </main>
  );
}
