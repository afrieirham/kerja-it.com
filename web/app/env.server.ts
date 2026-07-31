import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
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
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
