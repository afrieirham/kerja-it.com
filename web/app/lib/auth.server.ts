import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "~/db";
import { env } from "~/env.server";

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "pg" }),
	secret: env.BETTER_AUTH_SECRET,
	...(env.BETTER_AUTH_URL ? { baseURL: env.BETTER_AUTH_URL } : {}),
	socialProviders: {
		...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
			? {
					google: {
						clientId: env.GOOGLE_CLIENT_ID,
						clientSecret: env.GOOGLE_CLIENT_SECRET,
					},
				}
			: {}),
		...(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET
			? {
					linkedin: {
						clientId: env.LINKEDIN_CLIENT_ID,
						clientSecret: env.LINKEDIN_CLIENT_SECRET,
					},
				}
			: {}),
	},
});

export type SocialProvider = "google" | "linkedin";

export const PROVIDER_LABELS: Record<SocialProvider, string> = {
	google: "Google",
	linkedin: "LinkedIn",
};

/** Providers with BOTH env vars set — the only buttons /sign-in renders. */
export const ENABLED_PROVIDERS = [
	...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
		? (["google"] as const)
		: []),
	...(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET
		? (["linkedin"] as const)
		: []),
];

export function isAdminEmail(email: string | null | undefined): boolean {
	if (!email || !env.ADMIN_EMAILS) return false;
	const admins = env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase());
	return admins.includes(email.toLowerCase());
}

/**
 * Session lookup that never throws: a misconfigured/unreachable auth stack
 * must not take down public pages (the root loader runs on every document
 * request) — it just renders as signed out.
 */
export async function getSession(request: Request) {
	try {
		return await auth.api.getSession({ headers: request.headers });
	} catch (error) {
		console.error("auth: getSession failed", error);
		return null;
	}
}
