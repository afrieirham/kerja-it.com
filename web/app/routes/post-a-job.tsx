import { eq } from "drizzle-orm";
import { useState } from "react";
import { Form, redirect, useNavigation } from "react-router";
import { z } from "zod";
import { Button } from "~/components/core/button";
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
import { job } from "~/db/schema";
import { env } from "~/env.server";
import { getSession } from "~/lib/auth.server";
import {
	FILTER_DIMENSIONS,
	FILTER_LABELS,
	type FilterKey,
	findFilterOption,
} from "~/lib/job-filters";
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
		throw redirect(`/sign-in?redirect=${encodeURIComponent("/post-a-job")}`);
	}

	return {
		user: { name: session.user.name, email: session.user.email },
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
	};
}

const formSchema = z.object({
	title: z.string().trim().min(3).max(120),
	company: z.string().trim().min(2).max(120),
	applyUrl: z
		.url("Enter a valid URL")
		.max(500)
		.refine((u) => u.startsWith("https://"), "Apply URL must use https://"),
	description: z.string().trim().min(30).max(5000),
	role: z.string(),
	seniority: z.string(),
	location: z.string(),
	salaryMode: z.enum(["range", "exact"]),
	salaryMin: z.coerce.number().int().min(1).max(1_000_000),
	// Absent in exact mode (the input isn't rendered).
	salaryMax: z.coerce.number().int().min(0).max(1_000_000).optional(),
});

export async function action({ request }: Route.ActionArgs) {
	const session = await getSession(request);
	if (!session) return { error: "You must be signed in." };

	const parsed = formSchema.safeParse(
		Object.fromEntries(await request.formData()),
	);
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message ?? "Invalid submission." };
	}
	const data = parsed.data;

	// Selects store exact job-filters.ts option values — direct posts skip
	// the regex extractor entirely.
	const role = findFilterOption("role", data.role)?.value ?? null;
	if (!role) return { error: "Pick a valid role." };
	const seniority = data.seniority
		? (findFilterOption("seniority", data.seniority)?.value ?? null)
		: null;
	if (data.seniority && !seniority) return { error: "Pick a valid seniority." };
	const location = data.location
		? (findFilterOption("location", data.location)?.value ?? null)
		: null;
	if (data.location && !location) return { error: "Pick a valid location." };

	const salaryMin = data.salaryMin;
	const salaryMax = data.salaryMode === "exact" ? salaryMin : data.salaryMax;
	if (!salaryMax || salaryMax < salaryMin) {
		return { error: "Salary max must be greater than or equal to the min." };
	}

	// Job.url is unique — a repost of a URL we already carry would conflict
	// silently, so fail loudly instead.
	const existing = await db
		.select({ id: job.id })
		.from(job)
		.where(eq(job.url, data.applyUrl))
		.limit(1);
	if (existing.length > 0) {
		return { error: "This job is already listed (same apply URL)." };
	}

	const rm = (n: number) => `RM${n.toLocaleString("en-US")}`;
	const salary =
		salaryMin === salaryMax
			? `${rm(salaryMin)} / month`
			: `${rm(salaryMin)} – ${rm(salaryMax)} / month`;

	await db.insert(job).values({
		url: data.applyUrl,
		title: data.title,
		description: data.description,
		company: data.company,
		location,
		role,
		seniority,
		salary,
		salaryMin,
		salaryMax,
		source: "direct",
		status: "pending",
		postedById: session.user.id,
		postedAt: null,
	});

	// Moderation alert — fire-and-forget: a Telegram hiccup must not fail
	// the submission, the job is safely pending in /admin either way.
	if (env.TELEGRAM_ADMIN_CHAT_ID) {
		const text = [
			"<b>New job pending review</b>",
			`${escapeHtml(data.title)} — ${escapeHtml(data.company)}`,
			escapeHtml(session.user.email),
			`${SITE_URL}/admin`,
		].join("\n");
		void sendTelegramMessage(text, env.TELEGRAM_ADMIN_CHAT_ID);
	}

	return { submitted: true };
}

function FormSelect({
	name,
	filterKey,
	options,
	required,
}: {
	name: FilterKey;
	filterKey: FilterKey;
	options: { value: string; label: string }[];
	required?: boolean;
}) {
	const [value, setValue] = useState<string | null>(null);
	const label = FILTER_LABELS[filterKey];

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
				<SelectTrigger className="w-full">
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
		</div>
	);
}

export default function PostAJob({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { selects } = loaderData;
	const navigation = useNavigation();
	const submitting = navigation.state === "submitting";
	const [salaryMode, setSalaryMode] = useState<"range" | "exact">("range");

	if (actionData && "submitted" in actionData && actionData.submitted) {
		return (
			<div className="px-4">
				<Header />
				<main className="container mx-auto max-w-xl space-y-3 py-16 text-center">
					<h1 className="text-xl font-semibold">Submitted for review</h1>
					<p className="text-muted-foreground text-sm">
						We review every post before it goes live — usually within a day.
					</p>
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

				{actionData && "error" in actionData && actionData.error && (
					<p className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-xs">
						{actionData.error}
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
						/>
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
						/>
					</div>

					<div className="space-y-1">
						<label htmlFor="applyUrl" className="text-xs font-medium">
							Apply URL
						</label>
						<Input
							id="applyUrl"
							name="applyUrl"
							type="url"
							required
							maxLength={500}
							placeholder="https://careers.acme.com/jobs/123"
						/>
						<p className="text-muted-foreground text-xs">
							Where candidates apply — your ATS or careers page.
						</p>
					</div>

					<FormSelect
						name="role"
						filterKey="role"
						options={selects.role}
						required
					/>
					<div className="grid grid-cols-2 gap-2">
						<FormSelect
							name="seniority"
							filterKey="seniority"
							options={selects.seniority}
						/>
						<FormSelect
							name="location"
							filterKey="location"
							options={selects.location}
						/>
					</div>

					<fieldset className="space-y-2">
						<legend className="text-xs font-medium">
							Salary (RM / month) — required
						</legend>
						<div className="flex gap-4 text-xs">
							<label className="inline-flex items-center gap-1">
								<input
									type="radio"
									name="salaryMode"
									value="range"
									checked={salaryMode === "range"}
									onChange={() => setSalaryMode("range")}
								/>
								Range
							</label>
							<label className="inline-flex items-center gap-1">
								<input
									type="radio"
									name="salaryMode"
									value="exact"
									checked={salaryMode === "exact"}
									onChange={() => setSalaryMode("exact")}
								/>
								Exact
							</label>
						</div>
						<div className="flex gap-2">
							<Input
								name="salaryMin"
								type="number"
								min={1}
								max={1000000}
								required
								placeholder={
									salaryMode === "exact" ? "Amount" : "Min, e.g. 5000"
								}
								aria-label={salaryMode === "exact" ? "Salary" : "Salary min"}
							/>
							{salaryMode === "range" && (
								<Input
									name="salaryMax"
									type="number"
									min={1}
									max={1000000}
									required
									placeholder="Max, e.g. 8000"
									aria-label="Salary max"
								/>
							)}
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
							rows={8}
							className="w-full rounded-none border border-input bg-transparent px-2.5 py-2 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
							placeholder="What the role does, the stack, and what you're looking for…"
						/>
					</div>

					<Button type="submit" disabled={submitting}>
						{submitting ? "Submitting…" : "Submit for review"}
					</Button>
				</Form>
			</main>
		</div>
	);
}
