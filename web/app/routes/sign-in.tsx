import { useState } from "react";
import { redirect } from "react-router";
import { Button } from "~/components/core/button";
import { Spinner } from "~/components/core/spinner";
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
		: "/dashboard";
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

	const [loading, setLoading] = useState({ google: false, linkedin: false });

	return (
		<div className="px-4">
			<Header />
			<main className="container mx-auto max-w-md space-y-6 py-16 text-center">
				<div className="space-y-2">
					<h1 className="text-xl font-semibold">Sign in to post a job</h1>
					<p className="text-muted-foreground text-sm">
						Verified posters only. All job will be reviewed before posted to
						ensure quality.
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
								onClick={() => {
									setLoading((loading) => ({ ...loading, [p.id]: true }));
									authClient.signIn.social({
										provider: p.id,
										callbackURL: redirectTo,
									});
								}}
							>
								{loading[p.id] ? (
									<Spinner />
								) : p.id === "google" ? (
									<GoogleIcon />
								) : (
									<LinkedInIcon />
								)}
								Continue with {p.label}
							</Button>
						))}
					</div>
				)}
			</main>
		</div>
	);
}

function GoogleIcon() {
	return (
		<svg
			version="1.1"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 48 48"
			xmlnsXlink="http://www.w3.org/1999/xlink"
			style={{ display: "block" }}
		>
			<title>google icon</title>
			<path
				fill="#EA4335"
				d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
			></path>
			<path
				fill="#4285F4"
				d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
			></path>
			<path
				fill="#FBBC05"
				d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
			></path>
			<path
				fill="#34A853"
				d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
			></path>
			<path fill="none" d="M0 0h48v48H0z"></path>
		</svg>
	);
}

function LinkedInIcon() {
	return (
		<svg
			width="256"
			height="256"
			preserveAspectRatio="xMidYMid"
			viewBox="0 0 256 256"
		>
			<title>linkedin icon</title>
			<path
				d="M218.123 218.127h-37.931v-59.403c0-14.165-.253-32.4-19.728-32.4-19.756 0-22.779 15.434-22.779 31.369v60.43h-37.93V95.967h36.413v16.694h.51a39.907 39.907 0 0 1 35.928-19.733c38.445 0 45.533 25.288 45.533 58.186l-.016 67.013ZM56.955 79.27c-12.157.002-22.014-9.852-22.016-22.009-.002-12.157 9.851-22.014 22.008-22.016 12.157-.003 22.014 9.851 22.016 22.008A22.013 22.013 0 0 1 56.955 79.27m18.966 138.858H37.95V95.967h37.97v122.16ZM237.033.018H18.89C8.58-.098.125 8.161-.001 18.471v219.053c.122 10.315 8.576 18.582 18.89 18.474h218.144c10.336.128 18.823-8.139 18.966-18.474V18.454c-.147-10.33-8.635-18.588-18.966-18.453"
				fill="#0A66C2"
			/>
		</svg>
	);
}
