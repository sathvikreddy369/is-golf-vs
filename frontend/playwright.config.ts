import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "dummy-anon-key",
      NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:4000",
      BACKEND_INTERNAL_API_SECRET: "dummy-secret",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:4173",
    },
  },
});
