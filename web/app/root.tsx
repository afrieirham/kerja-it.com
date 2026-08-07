import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";

import { TooltipProvider } from "~/components/core/tooltip";
import { getSession } from "~/lib/auth.server";
import { buildMeta, SITE_NAME } from "~/lib/seo";
import type { Route } from "./+types/root";
import "./app.css";

/**
 * Session for the header (sign-in/out state). Loaded at the root rather than
 * via authClient.useSession() so first paint is SSR-correct — and because
 * useSession() would come from a module the dot-client Vite plugin stubs out
 * on the server (see AGENTS.md). getSession never throws: on any auth-stack
 * failure the header just renders as signed out.
 */
export async function loader({ request }: Route.LoaderArgs) {
	const session = await getSession(request);
	return { user: session?.user ?? null };
}

export const links: Route.LinksFunction = () => [
	// public/favicon.ico previously resolved by static-path luck only.
	{ rel: "icon", href: "/favicon.ico", sizes: "any" },
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
	},
];

/**
 * Only reached when no child route matched (i.e. a 404 rendering the root
 * ErrorBoundary). React Router REPLACES parent meta with child meta rather
 * than merging, so every real route still has to call buildMeta itself.
 */
export function meta(_: Route.MetaArgs) {
	// No canonical: a 404 has no canonical identity, and pointing one at "/"
	// would tell Google the error page is a duplicate of the homepage.
	return buildMeta({
		title: `Page not found | ${SITE_NAME}`,
		noindex: true,
		canonical: false,
	});
}

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
				{import.meta.env.PROD && (
					<script
						defer
						src="https://analytics.afrieirham.com/script.js"
						data-website-id="3de8ed05-3bf8-46fd-873f-f368586ad776"
					></script>
				)}
			</head>
			<body>
				<TooltipProvider>{children}</TooltipProvider>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details =
			error.status === 404
				? "The requested page could not be found."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="pt-16 p-4 container mx-auto">
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && (
				<pre className="w-full p-4 overflow-x-auto">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}
