import { env } from "./config.js";
import { supabaseAdmin } from "./supabase.js";

async function sendEmail(to: string, subject: string, html: string) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    }),
  });
}

async function getUserEmail(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error) {
    return null;
  }
  return data.user?.email ?? null;
}

export async function sendSubscriptionStatusEmail(userId: string, status: string) {
  const email = await getUserEmail(userId);
  if (!email) return;

  await sendEmail(
    email,
    "Subscription update",
    `<p>Your subscription status is now <strong>${status}</strong>.</p><p>Visit your dashboard for details.</p>`,
  );
}

export async function sendDrawPublishedNotifications(drawId: string) {
  const [{ data: draw }, { data: winners }, { data: activeSubscriptions }] = await Promise.all([
    supabaseAdmin.from("draws").select("draw_month, winning_numbers").eq("id", drawId).maybeSingle(),
    supabaseAdmin.from("draw_winners").select("user_id, tier, prize_cents").eq("draw_id", drawId),
    supabaseAdmin.from("subscriptions").select("user_id").eq("status", "active"),
  ]);

  if (!draw) {
    return;
  }

  const winnerMap = new Map<string, { tier: string; prize_cents: number }>();
  (winners ?? []).forEach((winner) => {
    winnerMap.set(winner.user_id, { tier: winner.tier, prize_cents: winner.prize_cents });
  });

  const userIds = Array.from(new Set((activeSubscriptions ?? []).map((sub) => sub.user_id)));

  await Promise.all(
    userIds.map(async (userId) => {
      const email = await getUserEmail(userId);
      if (!email) return;

      const winner = winnerMap.get(userId);
      if (winner) {
        await sendEmail(
          email,
          "You have won in this month draw",
          `<p>Draw month: <strong>${draw.draw_month}</strong></p>
           <p>Winning numbers: <strong>${draw.winning_numbers.join(", ")}</strong></p>
           <p>Your tier: <strong>${winner.tier}</strong></p>
           <p>Prize amount: <strong>Rs ${(winner.prize_cents / 100).toFixed(2)}</strong></p>
           <p>Please upload your proof in dashboard for verification.</p>`,
        );
      } else {
        await sendEmail(
          email,
          "Monthly draw result published",
          `<p>Draw month: <strong>${draw.draw_month}</strong></p>
           <p>Winning numbers: <strong>${draw.winning_numbers.join(", ")}</strong></p>
           <p>Check your dashboard for participation status and next draw updates.</p>`,
        );
      }
    }),
  );
}
