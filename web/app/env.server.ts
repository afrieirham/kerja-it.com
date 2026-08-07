import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		DATABASE_URL: z.url(),
		CRON_API_KEY: z.string(),
		// Optional — unset just disables sponsored jobs from Careerjet.
		CAREERJET_API_KEY: z.string().optional(),
		// Optional — fallback visitor ip for local dev (browsers don't send
		// x-forwarded-for, so without this sponsored jobs are skipped locally).
		CAREERJET_DEV_IP: z.string().optional(),
		// Optional — unset just disables the daily Telegram digest.
		TELEGRAM_BOT_TOKEN: z.string().optional(),
		TELEGRAM_CHANNEL_ID: z.string().optional(),
		// Optional — private chat for moderation alerts (post-a-job). Unset
		// just skips the alert; /admin keeps working.
		TELEGRAM_ADMIN_CHAT_ID: z.string().optional(),
		// Required — signs better-auth session tokens. Generate:
		// openssl rand -base64 32
		BETTER_AUTH_SECRET: z.string().min(32),
		// Optional — better-auth infers the base URL from the request when
		// unset; set explicitly in production (https://kerja-it.com).
		BETTER_AUTH_URL: z.url().optional(),
		// Optional — a provider is only enabled when BOTH of its vars are set;
		// with none configured, sign-in renders as unavailable.
		GOOGLE_CLIENT_ID: z.string().optional(),
		GOOGLE_CLIENT_SECRET: z.string().optional(),
		LINKEDIN_CLIENT_ID: z.string().optional(),
		LINKEDIN_CLIENT_SECRET: z.string().optional(),
		// Optional — comma-separated emails allowed into /admin.
		ADMIN_EMAILS: z.string().optional(),
		// Optional — unset disables paid packs (checkout/webhook no-op).
		STRIPE_SECRET_KEY: z.string().optional(),
		STRIPE_WEBHOOK_SECRET: z.string().optional(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
