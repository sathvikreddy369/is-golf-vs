import assert from "node:assert/strict";
import test from "node:test";

import request from "supertest";

process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "service-role-key";
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";

const { app } = await import("./index.js");

test("GET /health returns service status", async () => {
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.service, "backend");
});

test("internal endpoint denies when secret header is missing", async () => {
  const res = await request(app)
    .post("/api/internal/user-charity-preference/upsert")
    .send({ userId: "00000000-0000-0000-0000-000000000000", charityId: "00000000-0000-0000-0000-000000000000", contributionPercent: 10 });

  assert.equal(res.status, 401);
});

test("cron endpoint denies without cron secret", async () => {
  const res = await request(app)
    .post("/api/internal/cron/monthly-draw")
    .send({});

  assert.equal(res.status, 401);
});

test("admin endpoint denies when internal secret is missing", async () => {
  const res = await request(app)
    .post("/api/internal/admin/charity/save")
    .send({
      name: "Test Charity",
      slug: "test-charity",
      description: "Test",
      featured: false,
      upcomingEvents: [],
    });

  assert.equal(res.status, 401);
});

test("create-subscription validates request body", async () => {
  const res = await request(app)
    .post("/api/billing/create-subscription")
    .send({ userId: "not-a-uuid", planInterval: "monthly" });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Invalid payload");
});
