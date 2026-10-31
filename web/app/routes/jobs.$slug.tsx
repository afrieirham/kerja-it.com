import { and, eq } from "drizzle-orm";
import { Link } from "react-router";
import { Button } from "~/components/core/button";
import { Footer } from "~/components/widget/footer";
import { Header } from "~/components/widget/header";
import { db } from "~/db";
import { job } from "~/db/schema";
import {
	ARRANGEMENT_OPTIONS,
	applyHref,
	EMPLOYMENT_TYPE_OPTIONS,
	labelFor,
} from "~/lib/job-attributes";
import { findFilterOption } from "~/lib/job-filters";
import { buildMeta, SITE_NAME } from "~/lib/seo";
import type { Route } from "./+types/jobs.$slug";

type Job = typeof job.$inferSelect;

const postedDateFormatter = new Intl.DateTimeFormat("en-GB", {
	dateStyle: "medium",
	timeZone: "UTC",
});

function parseCreatedAt(createdAt: string) {
	return new Date(`${createdAt.replace(" ", "T")}Z`);
}

/** Clamp on a word boundary for the meta description. */
function clamp(value: string, max: number): string {
	const flat = value.replace(/\s+/g, " ").trim();
	if (flat.length <= max) return flat;
	const cut = flat.slice(0, max - 1);
	const boundary = cut.lastIndexOf(" ");
	return `${(boundary > max * 0.6 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
}

const EMPLOYMENT_TYPE_JSONLD: Record<string, string> = {
	"full-time": "FULL_TIME",
	"part-time": "PART_TIME",
	internship: "INTERN",
	contract: "CONTRACTOR",
};

function jobPostingJsonLd(j: Job) {
	const locationLabel = findFilterOption("location", j.location)?.label;
	const posted = parseCreatedAt(j.createdAt);
	const validThrough = new Date(posted);
	validThrough.setUTCDate(validThrough.getUTCDate() + 60);

	return {
		"@context": "https://schema.org",
		"@type": "JobPosting",
		title: j.title,
		description: j.description,
		datePosted: j.createdAt.slice(0, 10),
		validThrough: validThrough.toISOString().slice(0, 10),
		hiringOrganization: {
			"@type": "Organization",
			name: j.company ?? SITE_NAME,
		},
		...(j.employmentType
			? { employmentType: EMPLOYMENT_TYPE_JSONLD[j.employmentType] }
			: {}),
		...(j.arrangement === "remote"
			? { jobLocationType: "TELECOMMUTE" }
			: j.city || locationLabel
				? {
						jobLocation: {
							"@type": "Place",
							address: {
								"@type": "PostalAddress",
								...(j.city ? { addressLocality: j.city } : {}),
								...(locationLabel ? { addressRegion: locationLabel } : {}),
								addressCountry: "MY",
							},
						},
					}
				: {}),
		...(j.salaryMin
			? {
					baseSalary: {
						"@type": "MonetaryAmount",
						currency: "MYR",
						value: {
							"@type": "QuantitativeValue",
							minValue: j.salaryMin,
							maxValue: j.salaryMax ?? j.salaryMin,
							unitText: "MONTH",
						},
					},
				}
			: {}),
	};
}

export async function loader({ params }: Route.LoaderArgs) {
	// Direct + published only: pending posts must not leak, and scraped jobs
	// have no page (their content lives at the source site).
	const [j] = await db
		.select()
		.from(job)
		.where(
			and(
				eq(job.slug, params.slug),
				eq(job.source, "direct"),
				eq(job.status, "published"),
			),
		)
		.limit(1);

	if (!j) throw new Response("Not found", { status: 404 });
	return { job: j };
}

export function meta({ loaderData }: Route.MetaArgs) {
	if (!loaderData) return buildMeta({ noindex: true });

	const j = loaderData.job;
	return [
		...buildMeta({
			title: `${j.title} at ${j.company ?? SITE_NAME} | ${SITE_NAME}`,
			description: clamp(j.description, 155),
			path: `/jobs/${j.slug}`,
		}),
		{ "script:ld+json": jobPostingJsonLd(j) },
	];
}

export default function JobPage({ loaderData }: Route.ComponentProps) {
	const { job: j } = loaderData;
	const locationLabel = findFilterOption("location", j.location)?.label;
	const isExternal = Boolean(j.url);

	const metaBits = [
		j.company,
		j.salary,
		labelFor(ARRANGEMENT_OPTIONS, j.arrangement),
		labelFor(EMPLOYMENT_TYPE_OPTIONS, j.employmentType),
		[j.city, locationLabel].filter(Boolean).join(", ") || null,
		`Posted ${postedDateFormatter.format(parseCreatedAt(j.createdAt))}`,
	].filter(Boolean);

	return (
		<div className="px-4">
			<Header />
			<main className="container mx-auto max-w-2xl space-y-6 py-8">
				<div className="space-y-3">
					<h1 className="text-xl font-semibold">{j.title}</h1>
					<p className="text-muted-foreground text-sm">
						{metaBits.join(" · ")}
					</p>
					<div>
						<Button>
							<a
								href={applyHref(j)}
								{...(isExternal
									? { target: "_blank", rel: "noopener noreferrer" }
									: {})}
							>
								{isExternal ? "Apply" : "Apply via email"}
							</a>
						</Button>
					</div>
				</div>

				<article className="whitespace-pre-wrap text-sm leading-relaxed wrap-break-word">
					{j.description}
				</article>

				<p className="text-muted-foreground text-xs">
					Direct employer post. Hiring?{" "}
					<Link to="/post-a-job" className="underline hover:text-foreground">
						Post your job free
					</Link>
					.
				</p>
			</main>
			<Footer />
		</div>
	);
}
