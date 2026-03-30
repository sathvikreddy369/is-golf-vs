import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const optionalNonEmpty = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional(),
);

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().email().optional(),
);

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),
  RAZORPAY_KEY_ID: optionalNonEmpty,
  RAZORPAY_KEY_SECRET: optionalNonEmpty,
  RAZORPAY_WEBHOOK_SECRET: optionalNonEmpty,
  RAZORPAY_PLAN_MONTHLY_ID: optionalNonEmpty,
  RAZORPAY_PLAN_YEARLY_ID: optionalNonEmpty,
  RAZORPAY_PLAN_MONTHLY_AMOUNT_CENTS: z.coerce.number().int().positive().default(100000),
  RAZORPAY_PLAN_YEARLY_AMOUNT_CENTS: z.coerce.number().int().positive().default(1000000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  BACKEND_INTERNAL_API_SECRET: optionalNonEmpty,
  CRON_SECRET: optionalNonEmpty,
  RESEND_API_KEY: optionalNonEmpty,
  EMAIL_FROM: optionalEmail,
});

export const env = envSchema.parse(process.env);
