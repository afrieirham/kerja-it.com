import Stripe from "stripe";
import { env } from "~/env.server";

// Null when unconfigured — callers degrade gracefully (checkout reports
// "unavailable", the webhook 503s) rather than crashing the app.
export const stripe = env.STRIPE_SECRET_KEY
	? new Stripe(env.STRIPE_SECRET_KEY)
	: null;

export function isStripeConfigured(): boolean {
	return Boolean(stripe && env.STRIPE_WEBHOOK_SECRET);
}
