// Option lists for direct-post fields that are deliberately NOT filter
// dimensions (no FILTER_DIMENSIONS entry, no public filter UI, no scraper
// extraction — see AGENTS.md). Set exactly by the /post-a-job form; scraped
// rows keep these columns null.

export const ARRANGEMENT_OPTIONS = [
	{ value: "remote", label: "Remote" },
	{ value: "hybrid", label: "Hybrid" },
	{ value: "on-site", label: "On-site" },
] as const;

export const EMPLOYMENT_TYPE_OPTIONS = [
	{ value: "full-time", label: "Full-time" },
	{ value: "part-time", label: "Part-time" },
	{ value: "internship", label: "Internship" },
	{ value: "contract", label: "Contract" },
] as const;

export type Arrangement = (typeof ARRANGEMENT_OPTIONS)[number]["value"];
export type EmploymentType = (typeof EMPLOYMENT_TYPE_OPTIONS)[number]["value"];

/** Label for a stored value, falling back to the raw value when unknown. */
export function labelFor(
	options: readonly { value: string; label: string }[],
	value: string | null | undefined,
): string | null {
	if (!value) return null;
	return options.find((o) => o.value === value)?.label ?? value;
}

/**
 * Where the APPLY action points: the external URL, or a mailto for
 * email-only posts. (Validation guarantees at least one exists.)
 */
export function applyHref(j: {
	url: string | null;
	applyEmail: string | null;
}): string {
	return j.url ?? `mailto:${j.applyEmail}`;
}

/**
 * Where to SEND people for a job: direct posts get their on-site page
 * (shareable, indexable, JobPosting JSON-LD); scraped jobs link straight
 * out. Returns null in the impossible both-missing case so callers can
 * skip the row defensively.
 */
export function sharePath(j: {
	source: string;
	slug: string | null;
	url: string | null;
}): string | null {
	if (j.source === "direct" && j.slug) return `/jobs/${j.slug}`;
	return j.url;
}
