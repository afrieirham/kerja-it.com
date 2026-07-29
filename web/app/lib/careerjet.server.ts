import { env } from "~/env.server";

const API_URL = "https://search.api.careerjet.net/v4/query";
const LOCALE = "en_MY";
// Careerjet caps responses at 20 jobs regardless of page_size (verified), so
// we fetch multiple pages to give the relevance filter enough raw inventory.
const PAGE_SIZE = 20;
const FETCH_PAGES = 2;
const FRAGMENT_SIZE = 200;
const MAX_SPONSORED = 10;
const TIMEOUT_MS = 4000;
const REFERER = "https://kerja-it.com/";

export type SponsoredJob = {
	id: string;
	title: string;
	url: string;
	company: string | null;
	location: string | null;
	salary: string | null;
	/** ISO string, null when unparseable. */
	date: string | null;
};

type CareerjetJob = {
	title?: string;
	company?: string;
	date?: string;
	description?: string;
	locations?: string;
	salary?: string;
	url?: string;
};

type CareerjetResponse = {
	type?: string;
	jobs?: CareerjetJob[];
};

// Relevance gate: Careerjet loosens relevance, so only show titles that look
// like tech jobs. Title-only matching — precision over recall, sponsored rows
// are a supplement, not the main inventory.
const TECH_TERMS = [
	"software",
	"developer",
	"programmer",
	"engineer",
	"frontend",
	"front end",
	"front-end",
	"backend",
	"back end",
	"back-end",
	"fullstack",
	"full stack",
	"full-stack",
	"mobile",
	"android",
	"ios",
	"flutter",
	"react native",
	"devops",
	"sre",
	"site reliability",
	"cloud",
	"data scientist",
	"data analyst",
	"data engineer",
	"machine learning",
	"ml engineer",
	"ai engineer",
	"artificial intelligence",
	"qa engineer",
	"quality assurance",
	"test engineer",
	"tester",
	"test automation",
	"sdet",
	"cybersecurity",
	"infosec",
	"security engineer",
	"penetration",
	"network engineer",
	"database",
	"dba",
	"scrum master",
	"product manager",
	"product owner",
	"ui ux",
	"ui/ux",
	"ux designer",
	"ui designer",
	"user experience",
	"user interface",
	"web designer",
	"product designer",
	"it support",
	"helpdesk",
	"tech lead",
	"technical lead",
	"engineering manager",
	"architect",
	"embedded",
	"firmware",
	"blockchain",
	"business analyst",
	"system analyst",
	"systems analyst",
	"it",
];

// Kills the obvious non-tech matches the include list would otherwise catch
// (e.g. "Graduate Engineer | Civil Engineering", "Tech Sales Architect").
const NON_TECH_TERMS = [
	"civil",
	"mechanical",
	"electrical",
	"chemical",
	"structural",
	"coastal",
	"bim",
	"manufacturing",
	"rotating",
	"production",
	"sales",
	"account manager",
	"beauty",
	"guest",
	"retail",
	"hospitality",
	"hotel",
	"store",
	"cashier",
	"promoter",
	"merchandiser",
	"loan",
	"supervisor",
	"crew",
	"waiter",
	"driver",
	"guard",
	"housekeeping",
	"kitchen",
	"chef",
	"barista",
	"nurse",
	"clinic",
	"medical",
	"pharmacy",
	"teacher",
	"lecturer",
	"human resources",
	"hr",
	"accounting",
	"audit",
	"tax",
	"procurement",
	"supplier",
	"supply chain",
	"logistics",
	"warehouse",
	"customer service",
	"drafter",
];

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTermRegex(terms: string[]) {
	return new RegExp(`\\b(?:${terms.map(escapeRegExp).join("|")})\\b`, "i");
}

const TECH_INCLUDE = buildTermRegex(TECH_TERMS);
const NON_TECH_EXCLUDE = buildTermRegex(NON_TECH_TERMS);

function isTechJob(title: string) {
	if (NON_TECH_EXCLUDE.test(title)) return false;
	return TECH_INCLUDE.test(title);
}

function normalize(job: CareerjetJob): SponsoredJob | null {
	if (!job.title || !job.url) return null;
	if (!isTechJob(job.title)) return null;

	const parsed = job.date ? new Date(job.date) : null;

	return {
		id: `cj:${job.url}`,
		title: job.title,
		url: job.url,
		company: job.company || null,
		location: job.locations || null,
		salary: job.salary || null,
		date:
			parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
	};
}

/** Fetches one result page. Fails open: any error returns []. */
async function fetchPage(
	query: URLSearchParams,
	page: number,
	apiKey: string,
): Promise<CareerjetJob[]> {
	try {
		const pageQuery = new URLSearchParams(query);
		pageQuery.set("page", String(page));

		const res = await fetch(`${API_URL}?${pageQuery}`, {
			headers: {
				Authorization: `Basic ${btoa(apiKey)}`,
				Referer: REFERER,
			},
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});

		if (!res.ok) {
			console.error(`careerjet: unexpected status ${res.status}`);
			return [];
		}

		const data = (await res.json()) as CareerjetResponse;
		if (data.type !== "JOBS" || !data.jobs) return [];
		return data.jobs;
	} catch (error) {
		console.error("careerjet: fetch failed", error);
		return [];
	}
}

/**
 * Searches Careerjet on behalf of a site visitor. Must be called request-time
 * with the visitor's own ip/user-agent (Careerjet requires both for click
 * attribution). Fails open: any error returns [] so the home page never
 * breaks because of a third-party outage.
 */
export async function searchCareerjet(params: {
	keywords: string;
	location: string | null;
	sort: "relevance" | "date";
	userIp: string | null;
	userAgent: string;
}): Promise<SponsoredJob[]> {
	const apiKey = env.CAREERJET_API_KEY;
	if (!apiKey) return [];

	// Careerjet hard-requires user_ip (403 without it). Locally there is no
	// x-forwarded-for, so fall back to a configured dev ip; without either,
	// skip sponsored jobs entirely.
	const userIp = params.userIp ?? env.CAREERJET_DEV_IP;
	if (!userIp) return [];

	const query = new URLSearchParams({
		locale_code: LOCALE,
		keywords: params.keywords,
		page_size: String(PAGE_SIZE),
		fragment_size: String(FRAGMENT_SIZE),
		sort: params.sort,
		user_ip: userIp,
		user_agent: params.userAgent,
	});
	// No location param = country-wide search. Default radius is 5km,
	// which strangles city searches, so widen it when filtering by city.
	if (params.location) {
		query.set("location", params.location);
		query.set("radius", "50");
	}

	const pages = await Promise.all(
		Array.from({ length: FETCH_PAGES }, (_, i) =>
			fetchPage(query, i + 1, apiKey),
		),
	);

	return pages
		.flat()
		.map(normalize)
		.filter((job) => job !== null)
		.slice(0, MAX_SPONSORED);
}
