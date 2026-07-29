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
} from "~/lib/job-filters";
import type { Route } from "./+types/home";

const PAGE_SIZE = 100;

// Sponsored rows: a few on top, then one interleaved every N owned rows.
const SPONSORED_TOP = 3;
const SPONSORED_EVERY = 15;

type JobItem = Route.ComponentProps["loaderData"]["jobs"][number];
type SponsoredItem = Route.ComponentProps["loaderData"]["sponsored"][number];

const ALL_LABELS = {
	role: "All Roles",
	seniority: "All Seniorities",
	location: "All Locations",
} as const satisfies Partial<Record<FilterKey, string>>;

type VisibleFilterKey = keyof typeof ALL_LABELS;

const FILTER_SELECT_KEYS = Object.keys(ALL_LABELS) as VisibleFilterKey[];

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

function buildWhere(q: string, filters: Record<FilterKey, string | null>) {
	const conditions: (SQL | undefined)[] = [];

	for (const token of q.split(/\s+/).filter(Boolean)) {
		const pattern = `%${escapeLike(token)}%`;
		conditions.push(
			or(ilike(job.title, pattern), ilike(job.description, pattern)),
		);
	}

	for (const key of FILTER_KEYS) {
		const dimension = FILTER_DIMENSIONS[key];
		const option = findFilterOption(key, filters[key]);
		if (!option) continue;

		const fields = dimension.searchDescription
			? [job.title, job.description]
			: [job.title];

		conditions.push(
			or(
				...option.patterns.map((pattern) =>
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

export function meta() {
	return [
		{ title: "Kerja-IT.com" },
		{ name: "description", content: "Find your next tech job in Malaysia." },
	];
}

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
	const q = (url.searchParams.get("q") ?? "").trim();

	const filters = Object.fromEntries(
		FILTER_KEYS.map((key) => [
			key,
			findFilterOption(key, url.searchParams.get(key))?.value ?? null,
		]),
	) as Record<FilterKey, string | null>;

	const where = and(
		buildWhere(q, filters),
		gte(job.createdAt, sql`CURRENT_TIMESTAMP - INTERVAL '3 months'`),
	);

	// Sponsored jobs are proxied per-request: Careerjet requires the visitor's
	// own ip/user-agent for click attribution. Locally there is no
	// x-forwarded-for — searchCareerjet falls back to CAREERJET_DEV_IP.
	const userIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
	const roleOption = findFilterOption("role", filters.role);
	const locationOption = findFilterOption("location", filters.location);

	const [jobs, total, sponsored] = await Promise.all([
		db
			.select()
			.from(job)
			.where(where)
			.orderBy(desc(job.createdAt), desc(job.id))
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
	value,
	onChange,
}: {
	dimensionKey: VisibleFilterKey;
	dimension: FilterDimension;
	value: string | null;
	onChange: (value: string | null) => void;
}) {
	return (
		<Select
			value={value}
			onValueChange={(v) => onChange(v)}
			items={[
				{ value: null, label: ALL_LABELS[dimensionKey] },
				...dimension.options.map((o) => ({ value: o.value, label: o.label })),
			]}
		>
			<SelectTrigger className="w-full">
				<SelectValue placeholder={FILTER_LABELS[dimensionKey]} />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value={null}>{ALL_LABELS[dimensionKey]}</SelectItem>
				{dimension.options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function JobTableRow({ j }: { j: JobItem }) {
	return (
		<TableRow>
			<TableCell>
				<a
					href={j.url}
					target="_blank"
					rel="noreferrer"
					className="block w-full max-w-4xl truncate font-medium hover:underline"
				>
					{j.title}
				</a>
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
	const { jobs, sponsored, page, totalPages, total, q, filters } = loaderData;
	const navigate = useNavigate();

	// Merge owned + sponsored rows: sponsored on top, then interleaved.
	const rows: Array<
		| { type: "job"; value: JobItem }
		| { type: "sponsored"; value: SponsoredItem }
	> = [];
	let sponsoredIdx = 0;
	for (
		;
		sponsoredIdx < Math.min(SPONSORED_TOP, sponsored.length);
		sponsoredIdx++
	) {
		rows.push({ type: "sponsored", value: sponsored[sponsoredIdx] });
	}
	for (const [i, j] of jobs.entries()) {
		rows.push({ type: "job", value: j });
		if ((i + 1) % SPONSORED_EVERY === 0 && sponsoredIdx < sponsored.length) {
			rows.push({ type: "sponsored", value: sponsored[sponsoredIdx] });
			sponsoredIdx++;
		}
	}

	const activeFilters = FILTER_KEYS.flatMap((key) => {
		const option = findFilterOption(key, filters[key]);
		return option ? [{ key, label: option.label }] : [];
	});
	const hasActiveFilters = q.length > 0 || activeFilters.length > 0;

	const pageHref = (p: number) => {
		const params = new URLSearchParams();
		if (q) params.set("q", q);
		for (const key of FILTER_KEYS) {
			const value = filters[key];
			if (value) params.set(key, value);
		}
		if (p > 1) params.set("page", String(p));
		const qs = params.toString();
		return qs ? `/?${qs}` : "/";
	};

	const onFilterChange = (key: FilterKey, value: string | null) => {
		const params = new URLSearchParams();
		if (q) params.set("q", q);
		for (const k of FILTER_KEYS) {
			const v = k === key ? value : filters[k];
			if (v) params.set(k, v);
		}
		const qs = params.toString();
		navigate(qs ? `/?${qs}` : "/");
	};

	const start = Math.max(1, Math.min(page - 2, totalPages - 4));
	const end = Math.min(totalPages, start + 4);
	const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

	return (
		<div className="px-4">
			<Header />
			<main className="container mx-auto space-y-4 py-4">
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
								value={filters[f.key] ?? ""}
							/>
						))}
					</Form>

					{FILTER_SELECT_KEYS.map((key) => (
						<FilterSelect
							key={key}
							dimensionKey={key}
							dimension={FILTER_DIMENSIONS[key]}
							value={filters[key]}
							onChange={(value) => onFilterChange(key, value)}
						/>
					))}
				</div>

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
		</div>
	);
}
