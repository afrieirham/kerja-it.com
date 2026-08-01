import { desc, eq } from "drizzle-orm";
import { Form } from "react-router";
import { Button } from "~/components/core/button";
import { Table, TableBody, TableCell, TableRow } from "~/components/core/table";
import { Header } from "~/components/widget/header";
import { db } from "~/db";
import { job, user } from "~/db/schema";
import { env } from "~/env.server";
import { getSession, isAdminEmail } from "~/lib/auth.server";
import { buildMeta, SITE_NAME } from "~/lib/seo";
import { isTelegramConfigured } from "~/lib/telegram.server";
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
		await db.update(job).set({ status: "published" }).where(eq(job.id, id));
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
							{pending.map((j) => (
								<TableRow key={j.id}>
									<TableCell>
										<div>
											<a
												href={j.url}
												target="_blank"
												rel="noreferrer"
												className="font-medium hover:underline"
											>
												{j.title}
											</a>
											<span className="text-muted-foreground">
												{j.company ? ` · ${j.company}` : ""}
												{j.salary ? ` · ${j.salary}` : ""}
											</span>
											{j.posterEmail && (
												<div className="text-muted-foreground text-xs">
													{j.posterEmail}
												</div>
											)}
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
							))}
						</TableBody>
					</Table>
				)}
			</main>
		</div>
	);
}
