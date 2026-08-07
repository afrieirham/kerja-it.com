import { and, eq, gte, sql } from "drizzle-orm";
import { useState } from "react";
import { Form, Link, redirect, useNavigation } from "react-router";
import { z } from "zod";
import { Button } from "~/components/core/button";
import { Field } from "~/components/core/field";
import { Input } from "~/components/core/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/core/select";
import { Header } from "~/components/widget/header";
import { db } from "~/db";
import { companyProfile, job } from "~/db/schema";
import { env } from "~/env.server";
import { getSession } from "~/lib/auth.server";
import { getCreditBalance, hasActiveFreePost } from "~/lib/credits.server";
import {
	ARRANGEMENT_OPTIONS,
	type Arrangement,
	EMPLOYMENT_TYPE_OPTIONS,
	labelFor,
} from "~/lib/job-attributes";
import {
	FILTER_DIMENSIONS,
	FILTER_LABELS,
	findFilterOption,
} from "~/lib/job-filters";
import { generateJobSlug } from "~/lib/job-slug.server";
import { buildMeta, SITE_NAME, SITE_URL } from "~/lib/seo";
import { escapeHtml, sendTelegramMessage } from "~/lib/telegram.server";
import type { Route } from "./+types/post-a-job";

export function meta() {
	return buildMeta({
		title: `Post a job | ${SITE_NAME}`,
		description: `Post a tech job on ${SITE_NAME} for free and reach software, data, DevOps and IT talent across Malaysia. Salary required.`,
		path: "/post-a-job",
	});
}

export async function loader({ request }: Route.LoaderArgs) {
	const session = await getSession(request);
	if (!session) {
		// Keep the query string so ?from= survives the sign-in round-trip.
		const url = new URL(request.url);
		throw redirect(
			`/sign-in?redirect=${encodeURIComponent(url.pathname + url.search)}`,
		);
	}

	// ?from=<jobId> duplicates one of the user's own posts into the form
	// (dashboard "Duplicate" action). Silently ignored when unknown/foreign.
	const from = new URL(request.url).searchParams.get("from");

	const [profile, sourceJob] = await Promise.all([
		db
			.select({ name: companyProfile.name })
			.from(companyProfile)
			.where(eq(companyProfile.userId, session.user.id))
			.limit(1),
		from
			? db
					.select({
						title: job.title,
						company: job.company,
						url: job.url,
						applyEmail: job.applyEmail,
						description: job.description,
						role: job.role,
						seniority: job.seniority,
						location: job.location,
						city: job.city,
						arrangement: job.arrangement,
						employmentType: job.employmentType,
						salaryMin: job.salaryMin,
						salaryMax: job.salaryMax,
					})
					.from(job)
					.where(and(eq(job.id, from), eq(job.postedById, session.user.id)))
					.limit(1)
			: Promise.resolve([]),
	]);

	return {
		user: { name: session.user.name, email: session.user.email },
		companyDefault: profile[0]?.name ?? "",
		prefill: sourceJob[0] ?? null,
		// value/label only — the ILIKE patterns stay server-side.
		selects: {
			role: FILTER_DIMENSIONS.role.options.map(({ value, label }) => ({
				value,
				label,
			})),
			seniority: FILTER_DIMENSIONS.seniority.options.map(
				({ value, label }) => ({ value, label }),
			),
			location: FILTER_DIMENSIONS.location.options.map(({ value, label }) => ({
				value,
				label,
			})),
		},
		arrangements: ARRANGEMENT_OPTIONS,
		employmentTypes: EMPLOYMENT_TYPE_OPTIONS,
	};
}

const isHttpsUrl = (value: string) => {
	try {
		return new URL(value).protocol === "https:";
	} catch {
		return false;
	}
};

const isEmail = (value: string) => z.email().safeParse(value).success;

const formSchema = z
	.object({
		title: z
			.string()
			.trim()
			.min(3, "Title is too short (min 3 characters)")
			.max(120, "Title is too long (max 120 characters)"),
		company: z
			.string()
			.trim()
			.min(2, "Enter the company name")
			.max(120, "Company is too long (max 120 characters)"),
		applyUrl: z
			.string()
			.trim()
			.max(500, "Apply URL is too long")
			.refine(
				(u) => u === "" || isHttpsUrl(u),
				"Apply URL must be a valid https:// link",
			),
		applyEmail: z
			.string()
			.trim()
			.max(254)
			.refine((e) => e === "" || isEmail(e), "Enter a valid apply email"),
		description: z
			.string()
			.trim()
			.min(30, "Description is too short (min 30 characters)")
			.max(5000, "Description is too long (max 5000 characters)"),
		role: z.string(),
		seniority: z.string(),
		// Optional at the schema level: both fields are unmounted for remote
		// jobs, so they are ABSENT from the FormData — requiredness for
		// hybrid/on-site is enforced in the action.
		location: z.string().optional(),
		city: z
			.string()
			.trim()
			.max(100, "City is too long (max 100 characters)")
			.optional(),
		arrangement: z.enum(["remote", "hybrid", "on-site"]),
		employmentType: z.enum([
			"full-time",
			"part-time",
			"internship",
			"contract",
		]),
		salaryMin: z.coerce.number().int().min(500, "Minimum RM500").max(1_000_000),
		// Absent in exact mode (the input isn't rendered).
		salaryMax: z.coerce
			.number()
			.int()
			.min(500, "Minimum RM500")
			.max(1_000_000)
			.optional(),
	})
	.superRefine((data, ctx) => {
		if (!data.applyUrl && !data.applyEmail) {
			// Attach to BOTH fields so both inputs show the error.
			for (const path of ["applyUrl", "applyEmail"] as const) {
				ctx.addIssue({
					code: "custom",
					path: [path],
					message: "Provide an apply URL, an apply email, or both.",
				});
			}
		}
	});

/** Field-keyed errors; "form" is reserved for non-field failures. */
type FieldErrors = Partial<Record<string, string>>;

function toFieldErrors(error: z.ZodError): FieldErrors {
	const errors: FieldErrors = {};
	for (const issue of error.issues) {
		const field = String(issue.path[0] ?? "form");
		if (!errors[field]) errors[field] = issue.message;
	}
	return errors;
}

export async function action({ request }: Route.ActionArgs) {
	const session = await getSession(request);
	if (!session) return { errors: { form: "You must be signed in." } };

	const parsed = formSchema.safeParse(
		Object.fromEntries(await request.formData()),
	);
	if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
	const data = parsed.data;

	const errors: FieldErrors = {};

	// Selects store exact job-filters.ts option values — direct posts skip
	// the regex extractor entirely.
	const role = findFilterOption("role", data.role)?.value ?? null;
	if (!role) errors.role = "Pick a valid role.";
	const seniority = data.seniority
		? (findFilterOption("seniority", data.seniority)?.value ?? null)
		: null;
	if (data.seniority && !seniority)
		errors.seniority = "Pick a valid seniority.";

	// Remote jobs carry no location at all — anything submitted is ignored.
	let location: string | null = null;
	let city: string | null = null;
	if (data.arrangement !== "remote") {
		location = findFilterOption("location", data.location ?? "")?.value ?? null;
		if (!location) errors.location = "Pick a state.";
		city = data.city || null;
		if (!city) errors.city = "City is required for hybrid/on-site jobs.";
	}

	const salaryMin = data.salaryMin;
	const salaryMaxInput = data.salaryMax;
	if (salaryMaxInput === undefined || salaryMaxInput < 1) {
		errors.salaryMax = "Enter the salary max.";
	} else if (salaryMaxInput < salaryMin) {
		errors.salaryMax = "Max must be greater than or equal to the min.";
	}

	if (Object.keys(errors).length > 0) return { errors };

	// Free tier first (1 active standard post per account), then pack
	// credits. Paid posts get the featured perks on approval.
	let isPaid = false;
	if (await hasActiveFreePost(session.user.id)) {
		const balance = await getCreditBalance(session.user.id);
		if (balance <= 0) {
			return {
				errors: {
					form: "You've used your free post. Get a pack at /pricing to post more.",
				},
			};
		}
		isPaid = true;
	}

	// The errors branch above returned for the undefined case; in exact
	// mode this already folds to salaryMin.
	const salaryMax = salaryMaxInput ?? salaryMin;

	const applyUrl = data.applyUrl || null;
	const applyEmail = data.applyEmail || null;

	const rm = (n: number) => `RM${n.toLocaleString("en-US")}`;
	const salary =
		salaryMin === salaryMax
			? `${rm(salaryMin)} / month`
			: `${rm(salaryMin)} – ${rm(salaryMax)} / month`;

	const values = {
		url: applyUrl,
		title: data.title,
		description: data.description,
		company: data.company,
		location,
		city,
		role,
		seniority,
		arrangement: data.arrangement,
		employmentType: data.employmentType,
		salary,
		salaryMin,
		salaryMax,
		applyEmail,
		isPaid,
		source: "direct",
		status: "pending",
		postedById: session.user.id,
		postedAt: null,
	};

	try {
		// Job.url is unique — a repost of a URL we already carry would
		// conflict silently, so fail loudly instead. Scoped to the 3-month
		// listing window: older roles may be reposted fresh. Email-only
		// posts skip the check: moderation is the dedupe gate there.
		if (applyUrl) {
			const existing = await db
				.select({ id: job.id })
				.from(job)
				.where(
					and(
						eq(job.url, applyUrl),
						gte(job.createdAt, sql`CURRENT_TIMESTAMP - INTERVAL '3 months'`),
					),
				)
				.limit(1);
			if (existing.length > 0) {
				return {
					errors: { applyUrl: "This job is already listed (same apply URL)." },
				};
			}
		}

		try {
			await db
				.insert(job)
				.values({ ...values, slug: generateJobSlug(data.title, data.company) });
		} catch {
			// Slug collision on the unique index is effectively impossible —
			// but the retry is free, and any OTHER insert error just throws
			// again into the outer catch.
			await db
				.insert(job)
				.values({ ...values, slug: generateJobSlug(data.title, data.company) });
		}
	} catch (error) {
		console.error("post-a-job: save failed", error);
		return { errors: { form: "Could not save the job — please try again." } };
	}

	// Moderation alert — fire-and-forget: a Telegram hiccup must not fail
	// the submission, the job is safely pending in /admin either way.
	if (env.TELEGRAM_ADMIN_CHAT_ID) {
		const text = [
			"<b>New job pending review</b>",
			`${escapeHtml(data.title)} — ${escapeHtml(data.company)} · ${escapeHtml(labelFor(ARRANGEMENT_OPTIONS, data.arrangement) ?? "")}`,
			escapeHtml(session.user.email),
			`${SITE_URL}/admin`,
		].join("\n");
		void sendTelegramMessage(text, env.TELEGRAM_ADMIN_CHAT_ID);
	}

	return { submitted: true, featured: isPaid };
}

function FieldError({ message }: { message?: string }) {
	if (!message) return null;
	return <p className="text-destructive text-xs">{message}</p>;
}

function FormSelect({
	name,
	label,
	options,
	required,
	defaultValue,
	error,
}: {
	name: string;
	label: string;
	options: readonly { value: string; label: string }[];
	required?: boolean;
	defaultValue?: string | null;
	error?: string;
}) {
	const [value, setValue] = useState<string | null>(defaultValue ?? null);

	return (
		<div className="space-y-1">
			<span className="text-xs font-medium">
				{label}
				{required ? "" : " (optional)"}
			</span>
			<Select
				value={value}
				onValueChange={(v) => setValue(v)}
				items={options.map((o) => ({ value: o.value, label: o.label }))}
			>
				<SelectTrigger className="w-full" aria-invalid={!!error}>
					<SelectValue placeholder={`Select ${label.toLowerCase()}`} />
				</SelectTrigger>
				<SelectContent>
					{options.map((o) => (
						<SelectItem key={o.value} value={o.value}>
							{o.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{/* base-ui Select isn't form-associated — carry the value ourselves. */}
			<input type="hidden" name={name} value={value ?? ""} />
			<FieldError message={error} />
		</div>
	);
}

export default function PostAJob({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { selects, arrangements, employmentTypes, companyDefault, prefill } =
		loaderData;
	const navigation = useNavigation();
	const submitting = navigation.state === "submitting";
	const [arrangement, setArrangement] = useState<Arrangement>(
		arrangements.find((o) => o.value === prefill?.arrangement)?.value ??
			"on-site",
	);
	const isRemote = arrangement === "remote";

	const errors: FieldErrors | undefined =
		actionData && "errors" in actionData ? actionData.errors : undefined;

	if (actionData && "submitted" in actionData && actionData.submitted) {
		return (
			<div className="px-4">
				<Header />
				<main className="container mx-auto max-w-xl space-y-3 py-16 text-center">
					<h1 className="text-xl font-semibold">Submitted for review</h1>
					<p className="text-muted-foreground text-sm">
						We review every post before it goes live — usually within a day.
					</p>
					{actionData && "featured" in actionData && actionData.featured && (
						<p className="text-muted-foreground text-sm">
							As a featured post, it will be pinned and pushed to Telegram once
							approved.
						</p>
					)}
					<div className="pt-2">
						<Button
							variant="outline"
							size="sm"
							render={<Link to="/dashboard?tab=listings" />}
						>
							View in dashboard
						</Button>
					</div>
				</main>
			</div>
		);
	}

	return (
		<div className="px-4">
			<Header />
			<main className="container mx-auto max-w-xl space-y-4 py-8">
				<div className="space-y-1">
					<h1 className="text-xl font-semibold">Post a job</h1>
					<p className="text-muted-foreground text-sm">
						Free while we grow. Reviewed before going live — no scams, no MLM.
						Salary is required: posts with visible salary get more applications.
					</p>
				</div>

				{prefill && (
					<p className="border border-border bg-muted px-3 py-2 text-muted-foreground text-xs">
						Duplicating “{prefill.title}” — review the details, then submit as a
						new post for review.
					</p>
				)}

				{errors?.form && (
					<p className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-xs">
						{errors.form}
					</p>
				)}

				<Form method="post" className="space-y-4">
					<div className="space-y-1">
						<label htmlFor="title" className="text-xs font-medium">
							Job title
						</label>
						<Input
							id="title"
							name="title"
							required
							minLength={3}
							maxLength={120}
							placeholder="Senior Frontend Engineer"
							defaultValue={prefill?.title ?? ""}
							aria-invalid={!!errors?.title}
						/>
						<FieldError message={errors?.title} />
					</div>

					<div className="space-y-1">
						<label htmlFor="company" className="text-xs font-medium">
							Company
						</label>
						<Input
							id="company"
							name="company"
							required
							minLength={2}
							maxLength={120}
							placeholder="Acme Sdn Bhd"
							defaultValue={prefill?.company ?? companyDefault}
							aria-invalid={!!errors?.company}
							disabled
						/>
						<FieldError message={errors?.company} />
					</div>

					<fieldset className="space-y-2">
						<legend className="text-xs font-medium">
							How candidates apply — at least one required
						</legend>
						<div className="space-y-1">
							<label
								htmlFor="applyUrl"
								className="text-muted-foreground text-xs"
							>
								Apply URL
							</label>
							<Input
								id="applyUrl"
								name="applyUrl"
								type="url"
								maxLength={500}
								placeholder="https://careers.acme.com/jobs/123"
								defaultValue={prefill?.url ?? ""}
								aria-invalid={!!errors?.applyUrl}
							/>
							<FieldError message={errors?.applyUrl} />
						</div>
						<div className="space-y-1">
							<label
								htmlFor="applyEmail"
								className="text-muted-foreground text-xs"
							>
								Apply email
							</label>
							<Input
								id="applyEmail"
								name="applyEmail"
								type="email"
								maxLength={254}
								placeholder="hiring@acme.com"
								defaultValue={prefill?.applyEmail ?? ""}
								aria-invalid={!!errors?.applyEmail}
							/>
							<FieldError message={errors?.applyEmail} />
						</div>
					</fieldset>

					<FormSelect
						name="role"
						label={FILTER_LABELS.role}
						options={selects.role}
						required
						defaultValue={prefill?.role}
						error={errors?.role}
					/>

					<div className="space-y-1">
						<span className="text-xs font-medium">Working arrangement</span>
						<div className="flex gap-4 text-xs">
							{arrangements.map((a) => (
								<label key={a.value} className="inline-flex items-center gap-1">
									<input
										type="radio"
										name="arrangement"
										value={a.value}
										checked={arrangement === a.value}
										onChange={() => setArrangement(a.value)}
									/>
									{a.label}
								</label>
							))}
						</div>
					</div>

					{!isRemote && (
						<div className="grid grid-cols-2 gap-2">
							<FormSelect
								name="location"
								label="State"
								options={selects.location}
								required
								defaultValue={prefill?.location}
								error={errors?.location}
							/>
							<div className="space-y-1">
								<label htmlFor="city" className="text-xs font-medium">
									City
								</label>
								<Input
									id="city"
									name="city"
									required
									maxLength={100}
									placeholder="Bangsar"
									defaultValue={prefill?.city ?? ""}
									aria-invalid={!!errors?.city}
								/>
								<FieldError message={errors?.city} />
							</div>
						</div>
					)}

					<div className="grid grid-cols-2 gap-2">
						<FormSelect
							name="seniority"
							label={FILTER_LABELS.seniority}
							options={selects.seniority}
							defaultValue={prefill?.seniority}
							error={errors?.seniority}
						/>
						<FormSelect
							name="employmentType"
							label="Employment type"
							options={employmentTypes}
							required
							defaultValue={prefill?.employmentType ?? "full-time"}
							error={errors?.employmentType}
						/>
					</div>

					<fieldset className="space-y-2">
						<legend className="text-xs font-medium">
							Salary (RM / month) — required
						</legend>
						<div className="flex gap-2">
							<Field data-invalid={errors?.salaryMin}>
								<Input
									name="salaryMin"
									type="number"
									min={1}
									max={1000000}
									required
									placeholder="Min, e.g. 5000"
									defaultValue={prefill?.salaryMin ?? ""}
									aria-label="Salary min"
									aria-invalid={!!errors?.salaryMin}
								/>
								<FieldError message={errors?.salaryMin} />
							</Field>
							<Field data-invalid={errors?.salaryMax}>
								<Input
									name="salaryMax"
									type="number"
									min={1}
									max={1000000}
									required
									placeholder="Max, e.g. 8000"
									defaultValue={prefill?.salaryMax ?? ""}
									aria-label="Salary max"
									aria-invalid={!!errors?.salaryMax}
								/>
								<FieldError message={errors?.salaryMax} />
							</Field>
						</div>
					</fieldset>

					<div className="space-y-1">
						<label htmlFor="description" className="text-xs font-medium">
							Description
						</label>
						<textarea
							id="description"
							name="description"
							required
							minLength={30}
							maxLength={5000}
							rows={18}
							className="w-full rounded-none border border-input bg-transparent px-2.5 py-2 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20"
							placeholder="What the role does, the stack, and what you're looking for…"
							defaultValue={prefill?.description ?? ""}
							aria-invalid={!!errors?.description}
						/>
						<FieldError message={errors?.description} />
					</div>

					<Button type="submit" disabled={submitting}>
						{submitting ? "Submitting…" : "Submit for review"}
					</Button>
				</Form>
			</main>
		</div>
	);
}
