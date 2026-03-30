import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-30 border-b border-foreground/10 bg-surface/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 md:px-10">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">GC</span>
          <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
            Golf Charity Platform
          </Link>
        </div>

        <nav className="hidden items-center gap-2 md:flex md:gap-3">
          <Link href="/" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-surface-alt">
            Home
          </Link>
          <Link href="/charities" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-surface-alt">
            Charities
          </Link>
          <Link href="/draws" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-surface-alt">
            Draws
          </Link>
          <Link href="/impact" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-surface-alt">
            Impact & Transparency
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-surface-alt">
                Dashboard
              </Link>
              <Link href="/admin" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-surface-alt">
                Admin
              </Link>
            </>
          ) : null}
          <Link
            href={user ? "/dashboard" : "/login"}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white"
          >
            {user ? "Open App" : "Login"}
          </Link>
        </nav>

        <details className="group relative md:hidden">
          <summary className="list-none rounded-lg border border-foreground/15 bg-white px-3 py-2 text-sm font-semibold text-foreground/80">
            Menu
          </summary>
          <nav className="absolute right-0 mt-2 flex w-64 flex-col gap-1 rounded-xl border border-foreground/10 bg-surface-elevated p-2 shadow-lg">
            <Link href="/" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-surface-alt">
              Home
            </Link>
            <Link href="/charities" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-surface-alt">
              Charities
            </Link>
            <Link href="/draws" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-surface-alt">
              Draws
            </Link>
            <Link href="/impact" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-surface-alt">
              Impact & Transparency
            </Link>
            {user ? (
              <>
                <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-surface-alt">
                  Dashboard
                </Link>
                <Link href="/admin" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-surface-alt">
                  Admin
                </Link>
              </>
            ) : null}
            <Link
              href={user ? "/dashboard" : "/login"}
              className="mt-1 rounded-lg bg-brand px-3 py-2 text-center text-sm font-semibold text-white"
            >
              {user ? "Open App" : "Login"}
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
