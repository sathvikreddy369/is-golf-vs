import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const allowedTypes = new Set(["users", "subscriptions", "winners", "verifications"]);

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const internalSecret = process.env.BACKEND_INTERNAL_API_SECRET;

  if (!internalSecret) {
    return NextResponse.json({ error: "Missing BACKEND_INTERNAL_API_SECRET" }, { status: 500 });
  }

  const type = request.nextUrl.searchParams.get("type") ?? "users";
  if (!allowedTypes.has(type)) {
    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }

  const response = await fetch(`${apiBaseUrl}/api/internal/admin/reports/export?type=${encodeURIComponent(type)}`, {
    method: "GET",
    headers: {
      "x-internal-secret": internalSecret,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ error: text || "Failed to export report" }, { status: response.status });
  }

  const csv = await response.text();
  const filename = `${type}-report-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
    },
  });
}
