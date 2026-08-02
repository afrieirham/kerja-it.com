import { desc, eq } from "drizzle-orm";
import { Form } from "react-router";
import { Badge } from "~/components/core/badge";
import { Button } from "~/components/core/button";
import { Table, TableBody, TableCell, TableRow } from "~/components/core/table";
import { Header } from "~/components/widget/header";
import { db } from "~/db";
import { job, user } from "~/db/schema";
import { env } from "~/env.server";
import { getSession, isAdminEmail } from "~/lib/auth.server";
import {
	ARRANGEMENT_OPTIONS,
	applyHref,
	EMPLOYMENT_TYPE_OPTIONS,
	labelFor,
} from "~/lib/job-attributes";
import { buildMeta, SITE_NAME, SITE_URL } from "~/lib/seo";
import {
	escapeHtml,
	isTelegramConfigured,
	sendTelegramMessage,
} from "~/lib/telegram.server";
import type { Route } from "./+types/admin";

export function meta() {
	return buildMeta({
		title: `Admin | ${SITE_NAME}`,
		path: "/admin",
		noindex: true,
	});
}

/** 404 (not 403) — the page's existence is not advertised. */
async function requireAdmin(request: Request) {
	const session = await getSession(request);
	if (!session || !isAdminEmail(session.user.email)) {
		throw new Response("Not found", { status: 404 });
	}
}

export async function loader({ request }: Route.LoaderArgs) {
	await requireAdmin(request);

	const pending = await db
		.select({
			id: job.id,
			title: job.title,
			company: job.company,
			salary: job.salary,
			url: job.url,
			applyEmail: job.applyEmail,
			isPaid: job.isPaid,
			arrangement: job.arrangement,
			employmentType: job.employmentType,
			city: job.city,
			createdAt: job.createdAt,
			posterEmail: user.email,
		})
		.from(job)
		.leftJoin(user, eq(job.postedById, user.id))
		.where(eq(job.status, "pending"))
		.orderBy(desc(job.createdAt));

	return {
		pending,
		telegramAlerts:
			isTelegramConfigured() && Boolean(env.TELEGRAM_ADMIN_CHAT_ID),
	};
}

export async function action({ request }: Route.ActionArgs) {
	await requireAdmin(request);

	const form = await request.formData();
	const id = String(form.get("id") ?? "");
	const intent = String(form.get("intent") ?? "");
	if (!id) return { ok: false };

	if (intent === "approve") {
		const [j] = await db
			.select({
				isPaid: job.isPaid,
				slug: job.slug,
				title: job.title,
				company: job.company,
				salary: job.salary,
			})
			.from(job)
			.where(eq(job.id, id))
			.limit(1);

		// Featured clock starts at approval, not submission — the employer
		// pays for 30 live days, not 30 days in the review queue.
		const featuredUntil = j?.isPaid
			? new Date(Date.now() + 30 * 86_400_000).toISOString()
			: null;

		await db
			.update(job)
			.set({
				status: "published",
				...(featuredUntil ? { featuredUntil } : {}),
			})
			.where(eq(job.id, id));

		// Instant dedicated Telegram post — the headline featured perk.
		// Fire-and-forget: the approval itself already succeeded.
		if (j?.isPaid && j.slug) {
			const meta = [j.company, j.salary].filter(Boolean).join(" · ");
			const text = [
				"<b>Featured job</b>",
				`<a href="${SITE_URL}/jobs/${escapeHtml(j.slug)}">${escapeHtml(j.title)}</a>${meta ? ` — ${escapeHtml(meta)}` : ""}`,
			].join("\n");
			void sendTelegramMessage(text);
		}
	} else if (intent === "delete") {
		await db.delete(job).where(eq(job.id, id));
	}

	return { ok: true };
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "UTC",
});

export default function Admin({ loaderData }: Route.ComponentProps) {
	const { pending, telegramAlerts } = loaderData;

	return (
		<div className="px-4">
			<Header />
			<main className="container mx-auto space-y-4 py-4">
				<div className="flex items-baseline justify-between">
					<h1 className="font-semibold">Pending jobs ({pending.length})</h1>
					<p className="text-muted-foreground text-xs">
						Telegram alerts: {telegramAlerts ? "configured" : "not configured"}
					</p>
				</div>

				{pending.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Nothing pending review.
					</p>
				) : (
					<Table>
						<TableBody>
							{pending.map((j) => {
								const bits = [
									labelFor(ARRANGEMENT_OPTIONS, j.arrangement),
									labelFor(EMPLOYMENT_TYPE_OPTIONS, j.employmentType),
									j.city,
									j.applyEmail,
								].filter(Boolean);
								return (
									<TableRow key={j.id}>
										<TableCell>
											<div>
												<a
													href={applyHref(j)}
													{...(j.url
														? { target: "_blank", rel: "noreferrer" }
														: {})}
													className="font-medium hover:underline"
												>
													{j.title}
												</a>
												{j.isPaid && <Badge className="ml-1">Paid</Badge>}
												<span className="text-muted-foreground">
													{j.company ? ` · ${j.company}` : ""}
													{j.salary ? ` · ${j.salary}` : ""}
												</span>
												<div className="text-muted-foreground text-xs">
													{[j.posterEmail, ...bits].filter(Boolean).join(" · ")}
												</div>
											</div>
										</TableCell>
										<TableCell className="text-muted-foreground whitespace-nowrap">
											{dateFormatter.format(
												new Date(`${j.createdAt.replace(" ", "T")}Z`),
											)}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-2">
												<Form method="post">
													<input type="hidden" name="id" value={j.id} />
													<Button
														size="xs"
														type="submit"
														name="intent"
														value="approve"
													>
														Approve
													</Button>
												</Form>
												<Form method="post">
													<input type="hidden" name="id" value={j.id} />
													<Button
														size="xs"
														variant="destructive"
														type="submit"
														name="intent"
														value="delete"
													>
														Delete
													</Button>
												</Form>
											</div>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				)}
			</main>
		</div>
	);
}
