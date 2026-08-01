import { redirect } from "react-router";
import { Button } from "~/components/core/button";
import { Header } from "~/components/widget/header";
import {
	ENABLED_PROVIDERS,
	getSession,
	PROVIDER_LABELS,
} from "~/lib/auth.server";
import { authClient } from "~/lib/auth-client";
import { buildMeta, SITE_NAME } from "~/lib/seo";
import type { Route } from "./+types/sign-in";

export function meta() {
	return buildMeta({
		title: `Sign in | ${SITE_NAME}`,
		description: `Sign in to post a tech job on ${SITE_NAME}. Verified posters only.`,
		path: "/sign-in",
		noindex: true,
	});
}

/** Only same-origin paths — blocks open-redirect via ?redirect=https://evil. */
function safeRedirect(value: string | null): string {
	return value?.startsWith("/") && !value.startsWith("//")
		? value
		: "/post-a-job";
}

export async function loader({ request }: Route.LoaderArgs) {
	const redirectTo = safeRedirect(
		new URL(request.url).searchParams.get("redirect"),
	);

	// Already signed in → no reason to be here.
	const session = await getSession(request);
	if (session) throw redirect(redirectTo);

	return {
		redirectTo,
		providers: ENABLED_PROVIDERS.map((id) => ({
			id,
			label: PROVIDER_LABELS[id],
		})),
	};
}

export default function SignIn({ loaderData }: Route.ComponentProps) {
	const { providers, redirectTo } = loaderData;

	return (
		<div className="px-4">
			<Header />
			<main className="container mx-auto max-w-sm space-y-6 py-16 text-center">
				<div className="space-y-2">
					<h1 className="text-xl font-semibold">Sign in to post a job</h1>
					<p className="text-muted-foreground text-sm">
						Verified posters only — no scams, no spam. Posting is free while we
						grow.
					</p>
				</div>
				{providers.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Sign-in is temporarily unavailable.
					</p>
				) : (
					<div className="flex flex-col gap-2">
						{providers.map((p) => (
							<Button
								key={p.id}
								variant="outline"
								className="w-full"
								onClick={() =>
									authClient.signIn.social({
										provider: p.id,
										callbackURL: redirectTo,
									})
								}
							>
								Continue with {p.label}
							</Button>
						))}
					</div>
				)}
			</main>
		</div>
	);
}
