import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.url(),
		CRON_API_KEY: z.string(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
