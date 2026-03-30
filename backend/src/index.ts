import crypto from "node:crypto";

import cors from "cors";
import express from "express";
import { z } from "zod";

import { env } from "./config.js";
import { calculateMatchCount, generateWinningNumbers, mapMatchTier, splitPrizePool, type DrawMode } from "./draws.js";
import { sendDrawPublishedNotifications, sendSubscriptionStatusEmail } from "./notifications.js";
import { getRazorpayClient, isRazorpayConfigured } from "./razorpay.js";
import { supabaseAdmin } from "./supabase.js";

const app = express();

function isInternalAuthorized(req: express.Request) {
  const secret = req.header("x-internal-secret");
  return Boolean(env.BACKEND_INTERNAL_API_SECRET && secret === env.BACKEND_INTERNAL_API_SECRET);
}

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  }),
);

// Keep raw body for webhook signature verification.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "backend", ts: new Date().toISOString() });
});

app.post("/api/internal/user-charity-preference/upsert", async (req, res) => {
  if (!isInternalAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const schema = z.object({
    userId: z.uuid(),
    charityId: z.uuid(),
    contributionPercent: z.number().min(10).max(100),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const { error } = await supabaseAdmin.from("user_charity_preferences").upsert(
    {
      user_id: parsed.data.userId,
      charity_id: parsed.data.charityId,
      contribution_percent: parsed.data.contributionPercent,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
});

app.post("/api/internal/winner-proof/upsert", async (req, res) => {
  if (!isInternalAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const schema = z.object({
    userId: z.uuid(),
    winnerId: z.uuid(),
    proofUrl: z.string().url().optional(),
    proofFileBase64: z.string().optional(),
    proofFileExtension: z.string().optional(),
    proofMimeType: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const { userId, winnerId, proofUrl, proofFileBase64, proofFileExtension, proofMimeType } = parsed.data;

  const { data: winner } = await supabaseAdmin
    .from("draw_winners")
    .select("id")
    .eq("id", winnerId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!winner) {
    return res.status(404).json({ error: "Winner not found" });
  }

  let finalProofUrl = proofUrl ?? "";

  if (proofFileBase64) {
    const bytes = Buffer.from(proofFileBase64, "base64");
    const ext = proofFileExtension || "png";
    const objectPath = `${userId}/${winnerId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("winner-proofs")
      .upload(objectPath, bytes, {
        contentType: proofMimeType || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      return res.status(500).json({ error: uploadError.message });
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("winner-proofs").getPublicUrl(objectPath);

    finalProofUrl = publicUrl;
  }

  if (!finalProofUrl) {
    return res.status(400).json({ error: "Missing proof URL or file" });
  }

  const { error } = await supabaseAdmin.from("winner_verifications").upsert(
    {
      winner_id: winnerId,
      proof_file_url: finalProofUrl,
      status: "pending",
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null,
    },
    { onConflict: "winner_id" },
  );

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true, proofUrl: finalProofUrl });
});

const createSubscriptionSchema = z.object({
  userId: z.uuid(),
  planInterval: z.enum(["monthly", "yearly"]),
  totalCount: z.number().int().positive().max(120).default(12),
});

app.post("/api/billing/create-subscription", async (req, res) => {
  const parsed = createSubscriptionSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid payload",
      details: parsed.error.flatten(),
    });
  }

  if (!isRazorpayConfigured() || !env.RAZORPAY_PLAN_MONTHLY_ID || !env.RAZORPAY_PLAN_YEARLY_ID) {
    return res.status(503).json({ error: "Billing is not configured" });
  }

  const razorpay = getRazorpayClient();
  if (!razorpay) {
    return res.status(503).json({ error: "Billing is not configured" });
  }

  const { userId, planInterval, totalCount } = parsed.data;
  const planId =
    planInterval === "monthly" ? env.RAZORPAY_PLAN_MONTHLY_ID : env.RAZORPAY_PLAN_YEARLY_ID;
  const amountCents =
    planInterval === "monthly"
      ? env.RAZORPAY_PLAN_MONTHLY_AMOUNT_CENTS
      : env.RAZORPAY_PLAN_YEARLY_AMOUNT_CENTS;

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: totalCount,
      customer_notify: 1,
      notes: {
        user_id: userId,
        plan_interval: planInterval,
      },
    });

    const { error } = await supabaseAdmin.from("subscriptions").insert({
      user_id: userId,
      provider_subscription_id: subscription.id,
      plan_interval: planInterval,
      status: "inactive",
      amount_cents: amountCents,
    });

    if (error) {
      return res.status(500).json({ error: "Failed to persist subscription", details: error.message });
    }

    return res.status(200).json({
      subscriptionId: subscription.id,
      status: subscription.status,
      planInterval,
      keyId: env.RAZORPAY_KEY_ID ?? null,
      shortUrl: subscription.short_url ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: "Failed to create Razorpay subscription", details: message });
  }
});

const createDonationSchema = z.object({
  userId: z.uuid(),
  charityName: z.string().min(1),
  amountCents: z.number().int().positive(),
  email: z.string().email().optional(),
});

app.post("/api/charity/create-donation-link", async (req, res) => {
  const parsed = createDonationSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid payload",
      details: parsed.error.flatten(),
    });
  }

  if (!isRazorpayConfigured()) {
    return res.status(503).json({ error: "Donations are not configured" });
  }

  const razorpay = getRazorpayClient();
  if (!razorpay) {
    return res.status(503).json({ error: "Donations are not configured" });
  }

  const { userId, charityName, amountCents, email } = parsed.data;

  try {
    const razorpayAny = razorpay as unknown as {
      paymentLink: {
        create: (payload: Record<string, unknown>) => Promise<{ id: string; short_url?: string }>;
      };
    };

    const paymentLink = await razorpayAny.paymentLink.create({
      amount: amountCents,
      currency: "INR",
      description: `Independent donation for ${charityName}`,
      accept_partial: false,
      customer: {
        name: "Donor",
        email: email ?? "donor@example.com",
        contact: "9999999999",
      },
      notes: {
        user_id: userId,
        charity_name: charityName,
        type: "independent_donation",
      },
    });

    return res.status(200).json({
      paymentLinkId: paymentLink.id,
      shortUrl: paymentLink.short_url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: "Failed to create donation link", details: message });
  }
});

const drawPublishedSchema = z.object({
  drawId: z.uuid(),
});

app.post("/api/notifications/draw-published", async (req, res) => {
  if (!isInternalAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = drawPublishedSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  await sendDrawPublishedNotifications(parsed.data.drawId);
  return res.status(200).json({ ok: true });
});

const adminCharitySchema = z.object({
  id: z.uuid().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.string().optional(),
  featured: z.boolean().default(false),
  upcomingEvents: z.array(z.string()).default([]),
});

app.post("/api/internal/admin/charity/save", async (req, res) => {
  if (!isInternalAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const parsed = adminCharitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });

  const { id, name, slug, description, imageUrl, featured, upcomingEvents } = parsed.data;
  const payload = {
    name,
    slug,
    description,
    image_url: imageUrl || null,
    is_featured: featured,
    upcoming_events: upcomingEvents,
  };

  const query = id
    ? supabaseAdmin.from("charities").update(payload).eq("id", id)
    : supabaseAdmin.from("charities").insert(payload);

  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
});

app.post("/api/internal/admin/charity/delete", async (req, res) => {
  if (!isInternalAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const parsed = z.object({ id: z.uuid() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  const { error } = await supabaseAdmin.from("charities").delete().eq("id", parsed.data.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
});

async function simulateMonthlyDraw(mode: DrawMode) {
  const [{ data: subscriptions }, { data: allScores }, { data: recentDraw }] = await Promise.all([
    supabaseAdmin.from("subscriptions").select("user_id, amount_cents").eq("status", "active"),
    supabaseAdmin.from("score_entries").select("user_id, stableford_score, score_date").order("score_date", { ascending: false }),
    supabaseAdmin
      .from("draws")
      .select("id, rollover_cents")
      .eq("status", "published")
      .order("draw_month", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const activeUserIds = Array.from(new Set((subscriptions ?? []).map((s) => s.user_id)));
  const totalPoolCents = (subscriptions ?? []).reduce((acc, s) => acc + (s.amount_cents ?? 0), 0);
  const rolloverIn = recentDraw?.rollover_cents ?? 0;

  const winningNumbers = generateWinningNumbers(
    mode,
    (allScores ?? []).map((s) => s.stableford_score),
  );

  const grouped = new Map<string, number[]>();
  (allScores ?? []).forEach((entry) => {
    const list = grouped.get(entry.user_id) ?? [];
    if (list.length < 5) {
      list.push(entry.stableford_score);
      grouped.set(entry.user_id, list);
    }
  });

  const prizeSplits = splitPrizePool(totalPoolCents, rolloverIn);
  const tierWinners = {
    match_5: [] as { userId: string }[],
    match_4: [] as { userId: string }[],
    match_3: [] as { userId: string }[],
  };
  const participantRows: Array<{ user_id: string; match_count: number }> = [];

  activeUserIds.forEach((userId) => {
    const userScores = grouped.get(userId) ?? [];
    const matchCount = calculateMatchCount(userScores, winningNumbers);
    participantRows.push({ user_id: userId, match_count: matchCount });
    const tier = mapMatchTier(matchCount);
    if (!tier) return;
    tierWinners[tier].push({ userId });
  });

  const drawMonth = new Date();
  drawMonth.setUTCDate(1);
  drawMonth.setUTCHours(0, 0, 0, 0);

  const { data: draw, error: drawError } = await supabaseAdmin
    .from("draws")
    .upsert(
      {
        draw_month: drawMonth.toISOString().slice(0, 10),
        mode,
        status: "simulated",
        winning_numbers: winningNumbers,
        rollover_cents: tierWinners.match_5.length ? 0 : prizeSplits.tier5,
        executed_at: new Date().toISOString(),
      },
      { onConflict: "draw_month" },
    )
    .select("id")
    .single();

  if (drawError || !draw) {
    throw new Error(drawError?.message ?? "Draw simulation failed");
  }

  const { error: ledgerError } = await supabaseAdmin.from("prize_pool_ledger").insert({
    draw_id: draw.id,
    active_subscribers: activeUserIds.length,
    total_pool_cents: totalPoolCents,
    tier_5_cents: prizeSplits.tier5,
    tier_4_cents: prizeSplits.tier4,
    tier_3_cents: prizeSplits.tier3,
    rollover_in_cents: rolloverIn,
    rollover_out_cents: tierWinners.match_5.length ? 0 : prizeSplits.tier5,
  });

  if (ledgerError) {
    throw new Error(ledgerError.message);
  }

  await supabaseAdmin.from("draw_participants").delete().eq("draw_id", draw.id);

  if (participantRows.length) {
    const { error: participantError } = await supabaseAdmin.from("draw_participants").insert(
      participantRows.map((row) => ({
        draw_id: draw.id,
        user_id: row.user_id,
        match_count: row.match_count,
      })),
    );

    if (participantError) {
      throw new Error(participantError.message);
    }
  }

  const winnerRows = [
    ...tierWinners.match_5.map((w) => ({ draw_id: draw.id, user_id: w.userId, tier: "match_5", prize_cents: 0, payout_status: "pending" })),
    ...tierWinners.match_4.map((w) => ({ draw_id: draw.id, user_id: w.userId, tier: "match_4", prize_cents: 0, payout_status: "pending" })),
    ...tierWinners.match_3.map((w) => ({ draw_id: draw.id, user_id: w.userId, tier: "match_3", prize_cents: 0, payout_status: "pending" })),
  ];

  await supabaseAdmin.from("draw_winners").delete().eq("draw_id", draw.id);

  if (winnerRows.length) {
    const tier4Share = tierWinners.match_4.length ? Math.floor(prizeSplits.tier4 / tierWinners.match_4.length) : 0;
    const tier3Share = tierWinners.match_3.length ? Math.floor(prizeSplits.tier3 / tierWinners.match_3.length) : 0;
    const tier5Share = tierWinners.match_5.length ? Math.floor(prizeSplits.tier5 / tierWinners.match_5.length) : 0;

    const pricedRows = winnerRows.map((row) => ({
      ...row,
      prize_cents: row.tier === "match_5" ? tier5Share : row.tier === "match_4" ? tier4Share : tier3Share,
    }));

    const { error: winnerError } = await supabaseAdmin.from("draw_winners").insert(pricedRows);
    if (winnerError) throw new Error(winnerError.message);
  }

  return draw.id;
}

app.post("/api/internal/admin/draw/simulate", async (req, res) => {
  if (!isInternalAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const parsed = z.object({ mode: z.enum(["random", "weighted"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });

  try {
    const drawId = await simulateMonthlyDraw(parsed.data.mode);
    return res.status(200).json({ ok: true, drawId });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Simulation failed" });
  }
});

app.post("/api/internal/admin/draw/publish", async (req, res) => {
  if (!isInternalAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const parsed = z.object({ drawId: z.uuid() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });

  const { error } = await supabaseAdmin
    .from("draws")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", parsed.data.drawId);
  if (error) return res.status(500).json({ error: error.message });

  await sendDrawPublishedNotifications(parsed.data.drawId);
  return res.status(200).json({ ok: true });
});

app.post("/api/internal/admin/verification/review", async (req, res) => {
  if (!isInternalAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const parsed = z.object({ id: z.uuid(), status: z.enum(["approved", "rejected"]), notes: z.string().optional(), reviewerId: z.uuid() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  const { id, status, notes, reviewerId } = parsed.data;
  const { error } = await supabaseAdmin
    .from("winner_verifications")
    .update({ status, review_notes: notes || null, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
});

app.post("/api/internal/admin/user/role", async (req, res) => {
  if (!isInternalAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const parsed = z.object({ userId: z.uuid(), role: z.enum(["subscriber", "admin"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  const { error } = await supabaseAdmin.from("profiles").update({ role: parsed.data.role }).eq("id", parsed.data.userId);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
});

app.post("/api/internal/admin/subscription/status", async (req, res) => {
  if (!isInternalAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const parsed = z.object({ subscriptionId: z.uuid(), status: z.enum(["inactive", "active", "past_due", "canceled", "lapsed"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  const updatePayload: { status: string; canceled_at?: string | null } = { status: parsed.data.status };
  if (parsed.data.status === "canceled" || parsed.data.status === "lapsed") {
    updatePayload.canceled_at = new Date().toISOString();
  }
  const { error } = await supabaseAdmin.from("subscriptions").update(updatePayload).eq("id", parsed.data.subscriptionId);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
});

app.post("/api/internal/admin/score/update", async (req, res) => {
  if (!isInternalAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const parsed = z.object({ scoreId: z.uuid(), score: z.number().int().min(1).max(45), scoreDate: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  const { error } = await supabaseAdmin.from("score_entries").update({ stableford_score: parsed.data.score, score_date: parsed.data.scoreDate }).eq("id", parsed.data.scoreId);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
});

app.post("/api/internal/admin/payout/mark-paid", async (req, res) => {
  if (!isInternalAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  const parsed = z.object({ winnerId: z.uuid() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });

  const { data: winner } = await supabaseAdmin
    .from("draw_winners")
    .select("prize_cents")
    .eq("id", parsed.data.winnerId)
    .maybeSingle();

  if (!winner) return res.status(404).json({ error: "Winner not found" });

  const [{ error: winnerError }, { error: payoutError }] = await Promise.all([
    supabaseAdmin.from("draw_winners").update({ payout_status: "paid" }).eq("id", parsed.data.winnerId),
    supabaseAdmin.from("payout_transactions").upsert(
      {
        winner_id: parsed.data.winnerId,
        amount_cents: winner.prize_cents,
        status: "paid",
        paid_at: new Date().toISOString(),
      },
      { onConflict: "winner_id" },
    ),
  ]);

  if (winnerError || payoutError) {
    return res.status(500).json({ error: winnerError?.message ?? payoutError?.message ?? "Payout failed" });
  }
  return res.status(200).json({ ok: true });
});

app.post("/api/internal/cron/monthly-draw", async (req, res) => {
  const cronSecret = req.header("x-cron-secret");
  if (!env.CRON_SECRET || cronSecret !== env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const drawId = await simulateMonthlyDraw("weighted");
    await supabaseAdmin
      .from("draws")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", drawId);
    await sendDrawPublishedNotifications(drawId);
    return res.status(200).json({ ok: true, drawId });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Cron draw failed" });
  }
});

function mapRazorpayStatus(rawStatus?: string) {
  switch (rawStatus) {
    case "active":
      return "active" as const;
    case "cancelled":
      return "canceled" as const;
    case "completed":
      return "canceled" as const;
    case "halted":
      return "lapsed" as const;
    case "pending":
      return "inactive" as const;
    default:
      return "inactive" as const;
  }
}

app.post("/api/billing/webhook", async (req, res) => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    return res.status(503).json({ error: "Webhook is not configured" });
  }

  const signature = req.header("x-razorpay-signature");
  const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody;

  if (!signature || !rawBody) {
    return res.status(400).json({ error: "Missing signature or request body" });
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== signature) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  const eventHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const { data: dedupeRows, error: dedupeError } = await supabaseAdmin
    .from("webhook_event_logs")
    .insert({ provider: "razorpay", event_key: eventHash })
    .select("event_key");

  if (dedupeError && !dedupeError.message.toLowerCase().includes("duplicate")) {
    return res.status(500).json({ error: "Webhook idempotency check failed", details: dedupeError.message });
  }

  if (!dedupeRows || dedupeRows.length === 0) {
    return res.status(200).json({ ok: true, duplicate: true });
  }

  const event = req.body as {
    event?: string;
    payload?: {
      subscription?: {
        entity?: {
          id?: string;
          status?: string;
          current_start?: number;
          current_end?: number;
          ended_at?: number;
          notes?: {
            user_id?: string;
            plan_interval?: "monthly" | "yearly";
          };
        };
      };
    };
  };

  const subscription = event.payload?.subscription?.entity;
  if (!subscription?.id) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  const mappedStatus = mapRazorpayStatus(subscription.status);

  // Update existing row by provider subscription id.
  const updatePayload = {
    status: mappedStatus,
    started_at: subscription.current_start
      ? new Date(subscription.current_start * 1000).toISOString()
      : null,
    current_period_end: subscription.current_end
      ? new Date(subscription.current_end * 1000).toISOString()
      : null,
    canceled_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
  };

  const { data: updatedRows, error: updateError } = await supabaseAdmin
    .from("subscriptions")
    .update(updatePayload)
    .eq("provider_subscription_id", subscription.id)
    .select("id, user_id, status");

  if (updateError) {
    return res.status(500).json({ error: "Failed to update subscription", details: updateError.message });
  }

  if (!updatedRows || updatedRows.length === 0) {
    const userId = subscription.notes?.user_id;
    const planInterval = subscription.notes?.plan_interval ?? "monthly";
    const amountCents =
      planInterval === "monthly"
        ? env.RAZORPAY_PLAN_MONTHLY_AMOUNT_CENTS
        : env.RAZORPAY_PLAN_YEARLY_AMOUNT_CENTS;

    if (!userId) {
      return res.status(200).json({ ok: true, ignored: true, reason: "Missing user_id in subscription notes" });
    }

    const { error: insertError } = await supabaseAdmin.from("subscriptions").insert({
      user_id: userId,
      provider_subscription_id: subscription.id,
      plan_interval: planInterval,
      status: mappedStatus,
      amount_cents: amountCents,
      started_at: updatePayload.started_at,
      current_period_end: updatePayload.current_period_end,
      canceled_at: updatePayload.canceled_at,
    });

    if (insertError) {
      return res.status(500).json({ error: "Failed to upsert missing subscription", details: insertError.message });
    }

    await sendSubscriptionStatusEmail(userId, mappedStatus);
  } else {
    await Promise.all(
      updatedRows.map((row) => sendSubscriptionStatusEmail(row.user_id, row.status)),
    );
  }

  return res.status(200).json({ ok: true, event: event.event ?? "unknown" });
});

app.listen(env.PORT, () => {
  console.log(`Backend listening on port ${env.PORT}`);
});
