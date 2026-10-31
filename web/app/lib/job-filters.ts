export type FilterOption = {
	value: string;
	label: string;
	/** ILIKE patterns, OR'd together. Server-side constants — never from the client. */
	patterns: string[];
	/** NOT ILIKE patterns, AND'd (e.g. Java excludes JavaScript). */
	exclude?: string[];
};

export type FilterDimension = {
	/** true → match title + description, false → title only. */
	searchDescription: boolean;
	options: FilterOption[];
};

export const JOB_ROLES: FilterDimension = {
	searchDescription: true,
	options: [
		{
			value: "software-engineer",
			label: "Software Engineer",
			patterns: ["%software engineer%", "%software developer%"],
		},
		{ value: "data", label: "Data", patterns: ["%data%"] },
		{
			value: "fullstack",
			label: "Full Stack",
			patterns: ["%full stack%", "%fullstack%", "%full-stack%"],
		},
		{
			value: "ai-ml",
			label: "AI / ML",
			patterns: [
				"%machine learning%",
				"%artificial intelligence%",
				"% ai %",
				"%ai engineer%",
				"%ml engineer%",
				"%ai/ml%",
				"%ai ml%",
				"%llm%",
				"%genai%",
			],
		},
		{
			value: "frontend",
			label: "Frontend",
			patterns: ["%frontend%", "%front end%", "%front-end%"],
		},
		{
			value: "support",
			label: "Support / Helpdesk",
			patterns: ["%support%", "%helpdesk%"],
		},
		{
			value: "devops-cloud",
			label: "DevOps / Cloud",
			patterns: [
				"%devops%",
				"%sre%",
				"%site reliability%",
				"%platform engineer%",
				"%cloud%",
			],
		},
		{
			value: "backend",
			label: "Backend",
			patterns: ["%backend%", "%back end%", "%back-end%"],
		},
		{
			value: "mobile",
			label: "Mobile",
			patterns: [
				"%mobile%",
				"%ios%",
				"%android%",
				"%flutter%",
				"%react native%",
			],
		},
		{
			value: "qa",
			label: "QA / Test",
			patterns: [
				"% qa %",
				"%qa engineer%",
				"%quality assurance%",
				"%quality engineer%",
				"%tester%",
				"%test engineer%",
				"%test automation%",
				"%sdet%",
			],
		},
		{ value: "analyst", label: "Analyst", patterns: ["%analyst%"] },
		{ value: "architect", label: "Architect", patterns: ["%architect%"] },
		{
			value: "uiux",
			label: "UI / UX Design",
			patterns: [
				"%designer%",
				"%ui/ux%",
				"% ui %",
				"% ux %",
				"%user experience%",
				"%user interface%",
			],
		},
		{
			value: "security",
			label: "Security",
			patterns: ["%security%", "%infosec%"],
		},
		{
			value: "web-developer",
			label: "Web Developer",
			patterns: ["%web developer%", "%website developer%"],
		},
		{ value: "network", label: "Network", patterns: ["%network%"] },
		{
			value: "tech-lead",
			label: "Tech Lead / Eng Manager",
			patterns: [
				"%tech lead%",
				"%technical lead%",
				"%engineering manager%",
				"%team lead%",
			],
		},
		{ value: "consultant", label: "Consultant", patterns: ["%consultant%"] },
		{
			value: "product",
			label: "Product",
			patterns: ["%product manager%", "%product owner%"],
		},
		{ value: "embedded", label: "Embedded", patterns: ["%embedded%"] },
		{
			value: "rpa",
			label: "RPA",
			patterns: ["%rpa%", "%robotic process%"],
		},
	],
};

export const JOB_SENIORITIES: FilterDimension = {
	searchDescription: true,
	options: [
		{
			value: "manager",
			label: "Manager",
			patterns: ["%manager%", "%head of%"],
		},
		{
			value: "lead",
			label: "Lead / Principal / Staff",
			patterns: ["% lead% ", "%principal%", "%staff engineer%"],
		},
		// Before "senior" on purpose: extractFirst (job-extract.server.ts)
		// takes the FIRST matching option, and "mid-senior" titles contain
		// "senior".
		{
			value: "mid-level",
			label: "Mid-Level",
			patterns: [
				"%mid-level%",
				"%mid level%",
				"%mid-senior%",
				"%intermediate%",
			],
		},
		{ value: "senior", label: "Senior", patterns: ["%senior%"] },
		{ value: "junior", label: "Junior", patterns: ["%junior%"] },
		{
			value: "fresh",
			label: "Fresh Grad / No Experience",
			patterns: [
				"%fresh grad%",
				"%fresh graduate%",
				"%entry level%",
				"%entry-level%",
				"%no experience%",
			],
		},
		{
			value: "intern",
			label: "Intern",
			patterns: ["% internship %"],
		},
	],
};

export const JOB_LOCATIONS: FilterDimension = {
	searchDescription: false,
	options: [
		{
			value: "kuala-lumpur",
			label: "Kuala Lumpur",
			patterns: ["%kuala lumpur%"],
		},
		{
			value: "selangor",
			label: "Selangor",
			patterns: [
				"%selangor%",
				"%petaling jaya%",
				"%subang%",
				"%shah alam%",
				"%cyberjaya%",
				"%puchong%",
				"%damansara%",
				"%klang%",
				"%kajang%",
				"%bangi%",
				"%seri kembangan%",
				"%rawang%",
				"%sepang%",
				"%ampang%",
				"%cheras%",
			],
		},
		{
			value: "penang",
			label: "Penang",
			patterns: [
				"%penang%",
				"%pulau pinang%",
				"%george town%",
				"%bayan lepas%",
				"%butterworth%",
				"%bukit mertajam%",
				"%gelugor%",
			],
		},
		{
			value: "johor",
			label: "Johor",
			patterns: [
				"%johor%",
				"%iskandar%",
				"%skudai%",
				"%pasir gudang%",
				"%kulai%",
			],
		},
		{ value: "putrajaya", label: "Putrajaya", patterns: ["%putrajaya%"] },
		{
			value: "melaka",
			label: "Melaka",
			patterns: ["%melaka%", "%malacca%"],
		},
		{
			value: "kedah",
			label: "Kedah",
			patterns: ["%kedah%", "%alor setar%", "%sungai petani%", "%kulim%"],
		},
		{
			value: "perak",
			label: "Perak",
			patterns: ["%perak%", "%ipoh%", "%taiping%"],
		},
		{
			value: "sarawak",
			label: "Sarawak",
			patterns: ["%sarawak%", "%kuching%", "%miri%", "%bintulu%", "%sibu%"],
		},
		{
			value: "negeri-sembilan",
			label: "Negeri Sembilan",
			patterns: ["%negeri sembilan%", "%seremban%", "%nilai%"],
		},
		{
			value: "sabah",
			label: "Sabah",
			patterns: ["%sabah%", "%kota kinabalu%"],
		},
		{
			value: "kelantan",
			label: "Kelantan",
			patterns: ["%kelantan%", "%kota bharu%"],
		},
		{
			value: "terengganu",
			label: "Terengganu",
			patterns: ["%terengganu%", "%kuala terengganu%", "%kemaman%"],
		},
		{ value: "pahang", label: "Pahang", patterns: ["%pahang%", "%kuantan%"] },
		{ value: "perlis", label: "Perlis", patterns: ["%perlis%", "%kangar%"] },
		{ value: "labuan", label: "Labuan", patterns: ["%labuan%"] },
	],
};

export const FILTER_DIMENSIONS = {
	role: JOB_ROLES,
	seniority: JOB_SENIORITIES,
	location: JOB_LOCATIONS,
} as const;

export type FilterKey = keyof typeof FILTER_DIMENSIONS;

export const FILTER_KEYS = Object.keys(FILTER_DIMENSIONS) as FilterKey[];

export const FILTER_LABELS: Record<FilterKey, string> = {
	role: "Role",
	seniority: "Seniority",
	location: "Location",
};

export function findFilterOption(
	key: FilterKey,
	value: string | null,
): FilterOption | undefined {
	if (!value) return undefined;
	return FILTER_DIMENSIONS[key].options.find((o) => o.value === value);
}
