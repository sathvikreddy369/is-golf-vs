import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),
  RAZORPAY_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
  RAZORPAY_PLAN_MONTHLY_ID: z.string().min(1).optional(),
  RAZORPAY_PLAN_YEARLY_ID: z.string().min(1).optional(),
  RAZORPAY_PLAN_MONTHLY_AMOUNT_CENTS: z.coerce.number().int().positive().default(100000),
  RAZORPAY_PLAN_YEARLY_AMOUNT_CENTS: z.coerce.number().int().positive().default(1000000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  BACKEND_INTERNAL_API_SECRET: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().email().optional(),
});

export const env = envSchema.parse(process.env);
