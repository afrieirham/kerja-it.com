import {
	and,
	desc,
	gte,
	ilike,
	notIlike,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import { useEffect, useState } from "react";
import { Form, Link, useNavigate } from "react-router";
import { Badge } from "~/components/core/badge";
import { Input } from "~/components/core/input";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "~/components/core/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/core/select";
import { Table, TableBody, TableCell, TableRow } from "~/components/core/table";
import { Footer } from "~/components/widget/footer";
import { Header } from "~/components/widget/header";
import { db } from "~/db";
import { job } from "~/db/schema";
import { searchCareerjet } from "~/lib/careerjet.server";
import {
	FILTER_DIMENSIONS,
	FILTER_KEYS,
	FILTER_LABELS,
	type FilterDimension,
	type FilterKey,
	findFilterOption,
	findFilterOptions,
} from "~/lib/job-filters";
import {
	absoluteUrl,
	buildMeta,
	canonicalPath,
	DEFAULT_DESCRIPTION,
	OG_IMAGE_PATH,
	SITE_NAME,
	SITE_URL,
} from "~/lib/seo";
import type { Route } from "./+types/home";

const PAGE_SIZE = 100;

// Sponsored rows: one interleaved every N owned rows; leftovers trail at
// the end so short/empty result sets still show them.
const SPONSORED_EVERY = 10;

type JobItem = Route.ComponentProps["loaderData"]["jobs"][number];
type SponsoredItem = Route.ComponentProps["loaderData"]["sponsored"][number];

const ALL_LABELS = {
	role: "All Roles",
	seniority: "All Seniorities",
	location: "All Locations",
} as const satisfies Partial<Record<FilterKey, string>>;

type VisibleFilterKey = keyof typeof ALL_LABELS;

const FILTER_SELECT_KEYS = Object.keys(ALL_LABELS) as VisibleFilterKey[];

const SEARCHABLE_FILTER_KEYS = new Set<VisibleFilterKey>(["role", "location"]);

const FILTER_COUNT_LABELS = {
	role: ["role", "roles"],
	seniority: ["seniority", "seniorities"],
	location: ["location", "locations"],
} as const satisfies Record<VisibleFilterKey, readonly [string, string]>;

const postedDateFormatter = new Intl.DateTimeFormat("en-GB", {
	dateStyle: "medium",
	timeZone: "UTC",
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
	numeric: "always",
});

function parseCreatedAt(createdAt: string) {
	return new Date(`${createdAt.replace(" ", "T")}Z`);
}

function formatPostedAt(createdAt: string) {
	return postedDateFormatter.format(parseCreatedAt(createdAt));
}

function formatPostedAtFromIso(iso: string) {
	return postedDateFormatter.format(new Date(iso));
}

function relativeFromMs(ms: number, now = Date.now()) {
	const minutes = Math.max(0, Math.floor((now - ms) / 60_000));
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	const months = Math.floor(days / 30);

	if (months >= 1) return relativeTimeFormatter.format(-months, "month");
	if (days >= 1) return relativeTimeFormatter.format(-days, "day");
	if (hours >= 1) return relativeTimeFormatter.format(-hours, "hour");
	return relativeTimeFormatter.format(-Math.max(1, minutes), "minute");
}

function relativeTime(createdAt: string, now = Date.now()) {
	return relativeFromMs(parseCreatedAt(createdAt).getTime(), now);
}

function relativeTimeFromIso(iso: string, now = Date.now()) {
	return relativeFromMs(new Date(iso).getTime(), now);
}

function escapeLike(value: string) {
	return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function buildWhere(q: string, filters: Record<FilterKey, string[]>) {
	const conditions: (SQL | undefined)[] = [];

	for (const token of q.split(/\s+/).filter(Boolean)) {
		const pattern = `%${escapeLike(token)}%`;
		conditions.push(
			or(ilike(job.title, pattern), ilike(job.description, pattern)),
		);
	}

	for (const key of FILTER_KEYS) {
		const dimension = FILTER_DIMENSIONS[key];
		const options = findFilterOptions(key, filters[key]);
		if (options.length === 0) continue;

		const fields = dimension.searchDescription
			? [job.title, job.description]
			: [job.title];
		const matches = options.flatMap((option) =>
			option.patterns.map((pattern) => ({ option, pattern })),
		);

		conditions.push(
			or(
				...matches.map(({ option, pattern }) =>
					or(
						...fields.map((field) =>
							and(
								ilike(field, pattern),
								...(option.exclude ?? []).map((ex) => notIlike(field, ex)),
							),
						),
					),
				),
			),
		);
	}

	return and(...conditions);
}

/** `q` is user input landing in <title>. Collapse whitespace and clamp. */
function cleanQuery(q: string) {
	const collapsed = q.replace(/\s+/g, " ").trim();
	return collapsed.length > 40
		? `${collapsed.slice(0, 40).trimEnd()}…`
		: collapsed;
}

/**
 * Builds a count-aware noun phrase, e.g. "Senior Frontend Jobs in Penang",
 * "1 Backend Job in Johor", or `Tech Jobs in Malaysia matching “react”`.
 * Labels keep their original casing — lowercasing would mangle the proper
 * nouns ("penang", "malaysia") that make up most of the filter values.
 */
function describeQuery(
	q: string,
	filters: Record<FilterKey, string[]>,
	count?: number,
) {
	const seniority = findFilterOption("seniority", filters.seniority[0])?.label;
	const role = findFilterOption("role", filters.role[0])?.label;
	const location = findFilterOption("location", filters.location[0])?.label;

	const subject = [seniority, role].filter(Boolean).join(" ") || "Tech";
	const noun = count === 1 ? "Job" : "Jobs";
	const prefix = count === undefined ? "" : `${count.toLocaleString("en-US")} `;
	const cleaned = cleanQuery(q);

	return [
		`${prefix}${subject} ${noun} in ${location ?? "Malaysia"}`,
		cleaned ? ` matching \u201c${cleaned}\u201d` : "",
	].join("");
}

export function meta({ location, loaderData }: Route.MetaArgs) {
	// loaderData is undefined when the ErrorBoundary renders.
	if (!loaderData) {
		return buildMeta({ path: location.pathname, noindex: true });
	}

	const { q, filters, page, total, jobs } = loaderData;
	const isBare =
		!q && FILTER_KEYS.every((key) => !filters[key][0]) && page === 1;
	const path = canonicalPath({ q, filters, page });

	// Zero rows on THIS page. Covers both an empty filter combo and an
	// out-of-range ?page=N (total can be non-zero while jobs is empty). Such a
	// page still renders sponsored Careerjet rows, so without noindex we would
	// be offering Google a page of nothing but outbound affiliate links.
	const noindex = jobs.length === 0;

	if (isBare) {
		return [
			...buildMeta({ path }),
			{
				"script:ld+json": {
					"@context": "https://schema.org",
					"@type": "WebSite",
					name: SITE_NAME,
					url: SITE_URL,
					description: DEFAULT_DESCRIPTION,
					inLanguage: "en-MY",
					publisher: {
						"@type": "Organization",
						name: SITE_NAME,
						url: SITE_URL,
						logo: absoluteUrl(OG_IMAGE_PATH),
					},
					potentialAction: {
						"@type": "SearchAction",
						target: {
							"@type": "EntryPoint",
							urlTemplate: `${SITE_URL}/?q={search_term_string}`,
						},
						"query-input": "required name=search_term_string",
					},
				},
			},
		];
	}

	const subject = describeQuery(q, filters);
	const counted = describeQuery(q, filters, total);
	const suffix = page > 1 ? ` \u2014 Page ${page}` : "";

	return buildMeta({
		path,
		noindex,
		title: `${subject}${suffix} | ${SITE_NAME}`,
		description: noindex
			? `No ${subject} right now. Browse the latest software engineering, data, DevOps and IT jobs across Malaysia on ${SITE_NAME}.`
			: `Browse ${counted} on ${SITE_NAME}. Fresh software engineering, data, DevOps and IT roles from across Malaysia, updated daily.`,
		ogDescription: noindex
			? `No ${subject} right now \u2014 browse the latest tech jobs across Malaysia instead.`
			: `${counted}, updated daily on ${SITE_NAME}.`,
	});
}

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
	const q = (url.searchParams.get("q") ?? "").trim();

	const filters = Object.fromEntries(
		FILTER_KEYS.map((key) => [
			key,
			findFilterOptions(
				key,
				url.searchParams.getAll(key).flatMap((value) => value.split(",")),
			).map((o) => o.value),
		]),
	) as Record<FilterKey, string[]>;

	const where = and(
		buildWhere(q, filters),
		gte(job.createdAt, sql`CURRENT_TIMESTAMP - INTERVAL '3 months'`),
	);

	// Sponsored jobs are proxied per-request: Careerjet requires the visitor's
	// own ip/user-agent for click attribution. Locally there is no
	// x-forwarded-for — searchCareerjet falls back to CAREERJET_DEV_IP.
	const userIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
	const roleOption = findFilterOption("role", filters.role[0]);
	const locationOption = findFilterOption("location", filters.location[0]);

	const [jobs, total, sponsored] = await Promise.all([
		db
			.select()
			.from(job)
			.where(where)
			.orderBy(
				desc(sql`coalesce(${job.postedAt}, ${job.createdAt})`),
				desc(job.id),
			)
			.limit(PAGE_SIZE)
			.offset((page - 1) * PAGE_SIZE),
		db.$count(job, where),
		searchCareerjet({
			keywords: q || roleOption?.label || "software",
			location: locationOption?.label ?? null,
			sort: q || roleOption ? "relevance" : "date",
			userIp: userIp ?? null,
			userAgent: request.headers.get("user-agent") ?? "",
		}),
	]);

	return {
		jobs: jobs.map((j) => ({ ...j, postedAgo: relativeTime(j.createdAt) })),
		sponsored,
		page,
		totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
		total,
		q,
		filters,
	};
}

function FilterSelect({
	dimensionKey,
	dimension,
	values,
	onChange,
}: {
	dimensionKey: VisibleFilterKey;
	dimension: FilterDimension;
	values: string[];
	onChange: (values: string[]) => void;
}) {
	const [search, setSearch] = useState("");
	const searchable = SEARCHABLE_FILTER_KEYS.has(dimensionKey);
	const normalizedSearch = search.trim().toLowerCase();
	const resetOption = { value: null, label: ALL_LABELS[dimensionKey] };
	const options = [
		resetOption,
		...dimension.options.map((o) => ({ value: o.value, label: o.label })),
	];
	const visibleOptions =
		searchable && normalizedSearch
			? options.filter((option) =>
					option.label.toLowerCase().includes(normalizedSearch),
				)
			: options;
	const [singular, plural] = FILTER_COUNT_LABELS[dimensionKey];

	return (
		<Select<string | null, true>
			multiple
			value={values}
			onOpenChange={(open) => {
				if (!open) setSearch("");
			}}
			onValueChange={(next) =>
				// The "All X" item is null, and gets toggled in like any other —
				// treat it as a reset instead.
				onChange(next.includes(null) ? [] : next.filter((v) => v !== null))
			}
			items={dimension.options.map((o) => ({ value: o.value, label: o.label }))}
		>
			<SelectTrigger className="w-full">
				<SelectValue placeholder={FILTER_LABELS[dimensionKey]}>
					{() =>
						values.length > 0
							? `${values.length} ${values.length === 1 ? singular : plural}`
							: FILTER_LABELS[dimensionKey]
					}
				</SelectValue>
			</SelectTrigger>
			<SelectContent
				header={
					searchable ? (
						<div className="sticky top-0 z-10 border-b bg-popover p-1.5">
							<Input
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								onKeyDown={(event) => {
									if (event.key !== "Escape" && event.key !== "Tab") {
										event.stopPropagation();
									}
								}}
								onPointerDown={(event) => event.stopPropagation()}
								placeholder={`Search ${plural}`}
								autoComplete="off"
								className="h-7"
							/>
						</div>
					) : undefined
				}
			>
				{visibleOptions.map((option) => (
					<SelectItem key={option.value ?? "all"} value={option.value}>
						{option.label}
					</SelectItem>
				))}
				{visibleOptions.length === 0 && (
					<div className="px-2 py-2 text-muted-foreground text-xs">
						No {plural} found
					</div>
				)}
			</SelectContent>
		</Select>
	);
}

function JobTableRow({ j }: { j: JobItem }) {
	return (
		<TableRow>
			<TableCell>
				<div className="truncate">
					<a
						href={j.url}
						target="_blank"
						rel="noreferrer"
						className="font-medium hover:underline"
					>
						{j.title}
					</a>
					{j.company && (
						<span className="text-muted-foreground">{` · ${j.company}`}</span>
					)}
				</div>
			</TableCell>
			<TableCell>
				<Badge variant="secondary">{j.source}</Badge>
			</TableCell>
			<TableCell
				className="text-muted-foreground"
				title={formatPostedAt(j.createdAt)}
			>
				{j.postedAgo}
			</TableCell>
		</TableRow>
	);
}

function SponsoredTableRow({ s }: { s: SponsoredItem }) {
	return (
		<TableRow>
			<TableCell>
				<div className="truncate">
					<a
						href={s.url}
						target="_blank"
						rel="sponsored nofollow noopener"
						className="font-medium hover:underline"
					>
						{s.title}
					</a>
					{(s.company || s.salary) && (
						<span className="text-muted-foreground">
							{s.company ? ` · ${s.company}` : ""}
							{s.salary ? ` · ${s.salary}` : ""}
						</span>
					)}
				</div>
			</TableCell>
			<TableCell>
				<Badge variant="outline">Sponsored</Badge>
			</TableCell>
			<TableCell
				className="text-muted-foreground"
				title={s.date ? formatPostedAtFromIso(s.date) : undefined}
			>
				{s.date ? relativeTimeFromIso(s.date) : "—"}
			</TableCell>
		</TableRow>
	);
}

export default function Home({ loaderData }: Route.ComponentProps) {
	const { jobs, sponsored, page, totalPages, total, q } = loaderData;
	const navigate = useNavigate();

	const [filters, setFilters] = useState(loaderData.filters);

	useEffect(() => {
		setFilters(loaderData.filters);
	}, [loaderData.filters]);

	// Merge owned + sponsored rows: interleaved, leftovers trailing.
	const rows: Array<
		| { type: "job"; value: JobItem }
		| { type: "sponsored"; value: SponsoredItem }
	> = [];
	let sponsoredIdx = 0;
	for (const [i, j] of jobs.entries()) {
		rows.push({ type: "job", value: j });
		if ((i + 1) % SPONSORED_EVERY === 0 && sponsoredIdx < sponsored.length) {
			rows.push({ type: "sponsored", value: sponsored[sponsoredIdx] });
			sponsoredIdx++;
		}
	}
	for (; sponsoredIdx < sponsored.length; sponsoredIdx++) {
		rows.push({ type: "sponsored", value: sponsored[sponsoredIdx] });
	}

	const activeFilters = FILTER_KEYS.flatMap((key) => {
		const options = findFilterOptions(key, filters[key]);
		return options.length === 0
			? []
			: [{ key, label: options.map((o) => o.label).join(" · ") }];
	});
	const hasActiveFilters = q.length > 0 || activeFilters.length > 0;

	const pageHref = (p: number) => canonicalPath({ q, filters, page: p });

	const onFilterChange = (key: FilterKey, values: string[]) => {
		const next = { ...filters, [key]: values };
		setFilters(next);
		navigate(canonicalPath({ q, filters: next }));
	};

	const start = Math.max(1, Math.min(page - 2, totalPages - 4));
	const end = Math.min(totalPages, start + 4);
	const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

	return (
		<div className="px-4">
			<div className="sticky top-0 z-20 bg-white pb-2">
				<Header />
				<div className="container mx-auto pb-3 pt-3">
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
						<Form method="get" className="flex gap-2">
							<Input
								key={q}
								name="q"
								defaultValue={q}
								placeholder="Search jobs…"
								className="max-w-sm"
							/>
							{activeFilters.map((f) => (
								<input
									key={f.key}
									type="hidden"
									name={f.key}
									value={filters[f.key].join(",")}
								/>
							))}
						</Form>

						{FILTER_SELECT_KEYS.map((key) => (
							<FilterSelect
								key={key}
								dimensionKey={key}
								dimension={FILTER_DIMENSIONS[key]}
								values={filters[key]}
								onChange={(values) => onFilterChange(key, values)}
							/>
						))}
					</div>
				</div>
				<div className="container mx-auto">
					<p className="text-muted-foreground text-xs">
						{total.toLocaleString("en-US")} jobs
						{q && (
							<>
								{" "}
								for{" "}
								<span className="font-medium text-foreground">
									&ldquo;{q}&rdquo;
								</span>
							</>
						)}
						{activeFilters.length > 0 && (
							<> · {activeFilters.map((f) => f.label).join(" · ")}</>
						)}
						{hasActiveFilters && (
							<>
								{" — "}
								<Link to="/" className="underline hover:text-foreground">
									Clear
								</Link>
							</>
						)}
					</p>
				</div>
			</div>
			<main className="container mx-auto space-y-4 py-4">
				<Table>
					<TableBody>
						{rows.map((row) =>
							row.type === "job" ? (
								<JobTableRow key={row.value.id} j={row.value} />
							) : (
								<SponsoredTableRow key={row.value.id} s={row.value} />
							),
						)}
					</TableBody>
				</Table>

				{sponsored.length > 0 && (
					<p className="text-muted-foreground text-xs">
						Sponsored jobs by{" "}
						<a
							href="https://www.careerjet.com"
							target="_blank"
							rel="noopener"
							className="underline hover:text-foreground"
						>
							Careerjet
						</a>
					</p>
				)}

				<Pagination>
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious
								href={page > 1 ? pageHref(page - 1) : undefined}
								aria-disabled={page <= 1}
								className={
									page <= 1 ? "pointer-events-none opacity-50" : undefined
								}
							/>
						</PaginationItem>
						{pages.map((p) => (
							<PaginationItem key={p}>
								<PaginationLink href={pageHref(p)} isActive={p === page}>
									{p}
								</PaginationLink>
							</PaginationItem>
						))}
						<PaginationItem>
							<PaginationNext
								href={page < totalPages ? pageHref(page + 1) : undefined}
								aria-disabled={page >= totalPages}
								className={
									page >= totalPages
										? "pointer-events-none opacity-50"
										: undefined
								}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
				<p className="text-center text-muted-foreground text-xs">
					Page {page} of {totalPages}
				</p>
			</main>
			<Footer />
		</div>
	);
}
