import {
	type FilterDimension,
	type FilterOption,
	JOB_LOCATIONS,
	JOB_ROLES,
	JOB_SENIORITIES,
} from "~/lib/job-filters";

export type ExtractedJob = {
	title: string;
	description: string;
	company: string | null;
	location: string | null;
	role: string | null;
	seniority: string | null;
	salary: string | null;
	postedAt: Date | null;
};

// --- Cleaning (moved from scraper; idempotent, so safe on both raw scraper
// text and legacy pre-mangled DB rows) ---

export function cleanTitle(raw: string): string {
	return raw
		.replaceAll(" di ", " | ")
		.replaceAll("sedang mencari pekerja untuk jawatan", "|");
}

export function cleanDescription(raw: string): string {
	return raw
		.replaceAll("Lihat ini dan pekerjaan yang serupa di LinkedIn.", "")
		.replaceAll(/^Dipaparkan\s+\d{1,2}:\d{2}:\d{2}\s+(?:PG|PTG)\.\s*/g, "");
}

// --- Title parsing ---

const KNOWN_SITES = [
	"linkedin",
	"jobstreet",
	"indeed",
	"glassdoor",
	"maukerja",
	"jobstore",
	"hiredly",
	"kalibrr",
	"myfuturejobs",
	"ricebowl",
	"monster",
	"grabjobs",
];

function isKnownSite(tail: string, source?: string): boolean {
	const lower = tail.trim().toLowerCase();
	return (
		KNOWN_SITES.some((site) => lower.includes(site)) ||
		// e.g. tail "JobStreet" vs source "my.jobstreet.com"
		(lower.length >= 3 && (source ?? "").toLowerCase().includes(lower))
	);
}

export function parseTitle(
	rawTitle: string,
	source?: string,
): { title: string; company: string | null; locationHint: string | null } {
	const title = rawTitle.trim();

	// 1. LinkedIn: "{Company} hiring {Title} in {Location} | LinkedIn"
	const linkedin =
		/^(.+?)\shiring\s(.+?)\sin\s(.+?)(?:\s*[|-]\s*linkedin)?$/i.exec(title);
	if (linkedin) {
		return {
			title: linkedin[2].trim(),
			company: linkedin[1].trim(),
			locationHint: linkedin[3].trim(),
		};
	}

	// 2. "{Company} sedang mencari pekerja untuk jawatan {Title}"
	const malay = /^(.+?)\ssedang mencari pekerja untuk jawatan\s+(.+)$/i.exec(
		title,
	);
	if (malay) {
		return {
			title: malay[2].trim(),
			company: malay[1].trim(),
			locationHint: null,
		};
	}

	// 3. "{Title} at {Company}" / "{Title} di {Company}"
	const at = /^(.+?)\s(?:at|di)\s(.+)$/i.exec(title);
	if (at) {
		return { title: at[1].trim(), company: at[2].trim(), locationHint: null };
	}

	// 4. Strip trailing " | {Site}" / " - {Site}" for known job sites.
	const siteSuffix = /^(.*?)\s*[|-]\s*([^|-]+)$/.exec(title);
	if (siteSuffix && isKnownSite(siteSuffix[2], source)) {
		return { title: siteSuffix[1].trim(), company: null, locationHint: null };
	}

	// 5. Backfill-compat: legacy DB titles were pre-mangled by the old cleanup
	// (" di " -> " | "), so split "title | company" when the tail is not a
	// known site. Best-effort — wrong guesses acceptable, company is cosmetic.
	const pipe = /^(.*?)\s*\|\s*([^|]+)$/.exec(title);
	if (pipe && !isKnownSite(pipe[2], source)) {
		return {
			title: pipe[1].trim(),
			company: pipe[2].trim(),
			locationHint: null,
		};
	}

	return { title, company: null, locationHint: null };
}

// --- Filter-dimension classification ---

export function matchesOption(option: FilterOption, text: string): boolean {
	const lower = text.toLowerCase();
	const strip = (pattern: string) => pattern.replaceAll("%", "");
	return (
		option.patterns.some((pattern) => lower.includes(strip(pattern))) &&
		(option.exclude ?? []).every((ex) => !lower.includes(strip(ex)))
	);
}

function extractFirst(dimension: FilterDimension, text: string): string | null {
	return (
		dimension.options.find((option) => matchesOption(option, text))?.value ??
		null
	);
}

export function extractLocation(text: string): string | null {
	return extractFirst(JOB_LOCATIONS, text);
}

export function extractRole(title: string): string | null {
	return extractFirst(JOB_ROLES, title);
}

export function extractSeniority(title: string): string | null {
	return extractFirst(JOB_SENIORITIES, title);
}

// --- Salary ---

const SALARY_RE =
	/\b(?:RM|MYR)\s?\d[\d,]*(?:\s?[kK])?(?:\s*(?:[-–—]|to)\s*(?:RM|MYR)?\s?\d[\d,]*(?:\s?[kK])?)?/;

export function extractSalary(text: string): string | null {
	return SALARY_RE.exec(text)?.[0] ?? null;
}

// --- Posted date ---

const POSTED_EN_RE = /posted\s+(\d+)\s+(hour|day|week|month)s?\s+ago/i;
const POSTED_MS_RE =
	/Dipaparkan\s+(\d+)\+?\s+(jam|hari|minggu|bulan)(?:\s+yang)?\s+lalu/i;
const POSTED_SAME_DAY_RE = /Dipaparkan\s+(\d{1,2}):(\d{2}):(\d{2})\s*(PG|PTG)/;

const UNIT_MS: Record<string, number> = {
	hour: 3_600_000,
	day: 86_400_000,
	week: 604_800_000,
	month: 2_592_000_000, // 30 days
	// Malay units: jam=hour, hari=day, minggu=week, bulan=month
	jam: 3_600_000,
	hari: 86_400_000,
	minggu: 604_800_000,
	bulan: 2_592_000_000,
};

export function extractPostedAt(rawDescription: string): Date | null {
	const en = POSTED_EN_RE.exec(rawDescription);
	if (en) {
		return new Date(Date.now() - Number(en[1]) * UNIT_MS[en[2].toLowerCase()]);
	}

	const ms = POSTED_MS_RE.exec(rawDescription);
	if (ms) {
		return new Date(Date.now() - Number(ms[1]) * UNIT_MS[ms[2].toLowerCase()]);
	}

	// Same-day posts carry a clock time, interpreted in UTC (deterministic;
	// the ambiguity only affects intra-day ordering). PG=AM, PTG=PM.
	const sameDay = POSTED_SAME_DAY_RE.exec(rawDescription);
	if (sameDay) {
		let hour = Number(sameDay[1]);
		if (sameDay[4] === "PTG" && hour < 12) hour += 12;
		const date = new Date();
		date.setUTCHours(hour, Number(sameDay[2]), Number(sameDay[3]), 0);
		return date;
	}

	return null;
}

// --- Entry point ---

// Extraction runs on RAW text (the cleanup hacks would destroy signals like
// " di " and the Dipaparkan prefix); cleaning happens after, for storage.
export function extractJob(input: {
	title: string;
	description: string;
	source: string;
}): ExtractedJob {
	const { title, description, source } = input;

	const postedAt = extractPostedAt(description);
	const parsed = parseTitle(title, source);

	return {
		title: cleanTitle(parsed.title),
		description: cleanDescription(description),
		company: parsed.company,
		location: extractLocation(`${title} ${description}`),
		// Parsed title (company/site stripped) — precision over recall.
		role: extractRole(parsed.title),
		seniority: extractSeniority(parsed.title),
		salary: extractSalary(`${title} ${description}`),
		postedAt,
	};
}
