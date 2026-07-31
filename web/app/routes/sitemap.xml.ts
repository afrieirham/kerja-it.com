import { and, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "~/db";
import { job } from "~/db/schema";
import { type FilterKey, findFilterOption } from "~/lib/job-filters";
import { canonicalPath, SITE_URL } from "~/lib/seo";

/**
 * Filter URLs are NOT reachable by crawlers — the filter UI is a <Select> +
 * navigate() and search is a GET <form>, neither of which Google follows. This
 * sitemap is therefore the only discovery path for them, which is exactly why
 * it is generated from the DB instead of hardcoded: emitting the full
 * job-filters.ts list would guarantee soft 404s for every sparse value
 * (perlis, labuan, rpa, embedded...).
 *
 * Counts come from the extracted role/location/seniority columns (exact-match
 * option values, see AGENTS.md) rather than the loader's ILIKE predicates.
 * Extraction is regex-only and nullable, so these UNDERCOUNT — which errs
 * toward omitting sparse combos, the direction we want.
 */
const MIN_JOBS = 3;

const COLUMNS = {
	role: job.role,
	seniority: job.seniority,
	location: job.location,
};

const WINDOW = sql`CURRENT_TIMESTAMP - INTERVAL '3 months'`;

type Entry = { path: string; lastmod: string | null };

async function entriesFor(key: FilterKey): Promise<Entry[]> {
	const column = COLUMNS[key];

	const rows = await db
		.select({
			value: column,
			lastmod: sql<string>`to_char(max(${job.createdAt}), 'YYYY-MM-DD')`,
		})
		.from(job)
		.where(and(gte(job.createdAt, WINDOW), isNotNull(column)))
		.groupBy(column)
		.having(sql`count(*) >= ${MIN_JOBS}`);

	return rows.flatMap(({ value, lastmod }) => {
		// Guard against values in the DB that no longer exist in job-filters.ts.
		if (!value || !findFilterOption(key, value)) return [];
		const filters: Partial<Record<FilterKey, string>> = { [key]: value };
		return [{ path: canonicalPath({ filters }), lastmod }];
	});
}

const escapeXml = (value: string) =>
	value.replace(
		/[<>&'"]/g,
		(c) =>
			({
				"<": "&lt;",
				">": "&gt;",
				"&": "&amp;",
				"'": "&apos;",
				'"': "&quot;",
			})[c] as string,
	);

export async function loader() {
	const [roles, seniorities, locations] = await Promise.all([
		entriesFor("role"),
		entriesFor("seniority"),
		entriesFor("location"),
	]);

	const [{ lastmod: homeLastmod } = { lastmod: null }] = await db
		.select({
			lastmod: sql<string | null>`to_char(max(${job.createdAt}), 'YYYY-MM-DD')`,
		})
		.from(job);

	const entries: Entry[] = [
		{ path: "/", lastmod: homeLastmod },
		...roles,
		...seniorities,
		...locations,
	];

	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...entries.map(({ path, lastmod }) =>
			[
				"\t<url>",
				`\t\t<loc>${escapeXml(`${SITE_URL}${path}`)}</loc>`,
				lastmod ? `\t\t<lastmod>${lastmod}</lastmod>` : null,
				`\t\t<priority>${path === "/" ? "1.0" : "0.6"}</priority>`,
				"\t</url>",
			]
				.filter(Boolean)
				.join("\n"),
		),
		"</urlset>",
		"",
	].join("\n");

	return new Response(body, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			// Job/Recruiter tables have no index on createdAt or the extracted
			// columns (schema.ts), so these GROUP BYs are seq scans. Bots hit
			// this rarely; cache to keep it off the hot path.
			"Cache-Control": "public, max-age=3600",
		},
	});
}
