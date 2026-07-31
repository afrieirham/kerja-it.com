import type { MetaDescriptor } from "react-router";
import { FILTER_KEYS, type FilterKey } from "~/lib/job-filters";

export const SITE_NAME = "Kerja-IT.com";

/**
 * Read from import.meta.env directly and NOT from ~/env.client. The
 * `react-router:dot-client` Vite plugin rewrites every export of any
 * `*.client.ts` module to `undefined` in the SSR build, so `env.VITE_APP_URL`
 * throws during server rendering — which is precisely when crawlers read these
 * tags. Vite inlines VITE_-prefixed vars into both the client and SSR bundles,
 * so import.meta.env is the only isomorphic source.
 *
 * Vite inlines this at BUILD time, so an unset var cannot be recovered at
 * runtime. We fall back to the production origin rather than throwing: these
 * URLs only feed SEO tags, and taking the whole site down over a missing
 * social-card variable is disproportionate. The fallback is also the correct
 * value in production — VITE_APP_URL is really an override for local/preview.
 *
 * Absolute origin, no trailing slash: og:image / og:url / canonical are
 * rejected by Facebook, X and Discord unless absolute.
 */
const PRODUCTION_ORIGIN = "https://kerja-it.com";

const RAW_SITE_URL: string = import.meta.env.VITE_APP_URL || PRODUCTION_ORIGIN;

if (!import.meta.env.VITE_APP_URL && import.meta.env.DEV) {
	console.warn(
		`[seo] VITE_APP_URL is unset — falling back to ${PRODUCTION_ORIGIN}. Set it in .env so canonical/og URLs match this environment.`,
	);
}

export const SITE_URL = RAW_SITE_URL.replace(/\/+$/, "");

/** 1200x630. Lives in web/public — see AGENTS.md. */
export const OG_IMAGE_PATH = "/og.png";
export const OG_IMAGE_ALT = `${SITE_NAME} — tech jobs in Malaysia`;

/**
 * Default copy. Lengths are deliberate, not arbitrary — keep them in range:
 *   title           50-60  chars (SERP title width)
 *   description    120-160 chars (SERP snippet width)
 *   ogDescription   80-125 chars (social card CTR sweet spot)
 * og:description is intentionally a SHORTER, separate string from the meta
 * description — reusing the 134-char one would overflow the social card.
 */
export const DEFAULT_TITLE = `${SITE_NAME} | Find Tech & Software Jobs in Malaysia`;
export const DEFAULT_DESCRIPTION =
	"Find your next tech job in Malaysia. Browse software engineering, data, DevOps and IT roles in Kuala Lumpur, Penang, Johor and remote.";
export const DEFAULT_OG_DESCRIPTION =
	"Browse software engineering, data, DevOps and IT jobs across Malaysia. Updated daily.";

/** Truncate on a word boundary so social cards never overflow their window. */
function clamp(value: string, max: number): string {
	if (value.length <= max) return value;
	const cut = value.slice(0, max - 1);
	const boundary = cut.lastIndexOf(" ");
	return `${(boundary > max * 0.6 ? cut.slice(0, boundary) : cut).trimEnd()}\u2026`;
}

export function absoluteUrl(path: string): string {
	return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Canonical path builder. Emits ONLY recognised params, in a fixed order, so
 * that param-order permutations and junk tracking params all collapse onto a
 * single canonical URL.
 */
export function canonicalPath({
	q,
	filters,
	page,
}: {
	q?: string;
	filters?: Partial<Record<FilterKey, string | null>>;
	page?: number;
}): string {
	const params = new URLSearchParams();
	if (q) params.set("q", q);
	for (const key of FILTER_KEYS) {
		const value = filters?.[key];
		if (value) params.set(key, value);
	}
	if (page && page > 1) params.set("page", String(page));
	const qs = params.toString();
	return qs ? `/?${qs}` : "/";
}

export type BuildMetaArgs = {
	title?: string;
	description?: string;
	/** Falls back to `description` only if that is already <= 125 chars. */
	ogDescription?: string;
	/** Root-relative path; made absolute for og:url and rel=canonical. */
	path?: string;
	image?: string;
	imageAlt?: string;
	/** `true` emits `noindex, follow` — still passes link equity onward. */
	noindex?: boolean;
	/** Set false on pages with no canonical identity of their own (404s). */
	canonical?: boolean;
	type?: "website" | "article";
};

/**
 * Single source of truth for every head tag a route needs. Routes must go
 * through this rather than hand-rolling descriptors: React Router does NOT
 * merge a child route's `meta` with the parent's, it REPLACES it, so defaults
 * declared on root.tsx would be silently clobbered by any route that exports
 * its own `meta`.
 */
export function buildMeta({
	title = DEFAULT_TITLE,
	description = DEFAULT_DESCRIPTION,
	ogDescription,
	path = "/",
	image = OG_IMAGE_PATH,
	imageAlt = OG_IMAGE_ALT,
	noindex = false,
	canonical = true,
	type = "website",
}: BuildMetaArgs = {}): MetaDescriptor[] {
	const url = absoluteUrl(path);
	const imageUrl = absoluteUrl(image);
	const social = clamp(
		ogDescription ??
			(description.length <= 125 ? description : DEFAULT_OG_DESCRIPTION),
		125,
	);

	return [
		{ title },
		{ name: "description", content: description },
		...(noindex ? [{ name: "robots", content: "noindex, follow" }] : []),

		// Open Graph — Facebook, LinkedIn, WhatsApp, Discord, Slack.
		{ property: "og:type", content: type },
		{ property: "og:site_name", content: SITE_NAME },
		{ property: "og:title", content: title },
		{ property: "og:description", content: social },
		{ property: "og:url", content: url },
		{ property: "og:locale", content: "en_MY" },
		{ property: "og:image", content: imageUrl },
		{ property: "og:image:width", content: "1200" },
		{ property: "og:image:height", content: "630" },
		{ property: "og:image:alt", content: imageAlt },

		// X. summary_large_image is what makes the image render full-width.
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:title", content: title },
		{ name: "twitter:description", content: social },
		{ name: "twitter:image", content: imageUrl },
		{ name: "twitter:image:alt", content: imageAlt },

		...(canonical
			? [{ tagName: "link" as const, rel: "canonical", href: url }]
			: []),
	];
}
