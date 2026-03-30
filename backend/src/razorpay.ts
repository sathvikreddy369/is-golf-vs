import Razorpay from "razorpay";

import { env } from "./config.js";

const razorpayConfigured = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

const razorpayClient = razorpayConfigured
  ? new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    })
  : null;

export function isRazorpayConfigured() {
  return razorpayConfigured;
}

export function getRazorpayClient() {
  return razorpayClient;
}
