import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/db";
import { job } from "~/db/schema";
import { env } from "~/env.server";
import { sharePath } from "~/lib/job-attributes";
import { SITE_URL } from "~/lib/seo";
import {
	escapeHtml,
	isTelegramConfigured,
	sendTelegramMessage,
} from "~/lib/telegram.server";
import type { Route } from "./+types/api.cron.telegram-digest";

// One message a day: cap the list so it stays scannable; overflow becomes a
// "+N more" footer line.
const MAX_JOBS = 10;
const WINDOW = sql`CURRENT_TIMESTAMP - INTERVAL '24 hours'`;

const bodySchema = z.object({ apiKey: z.string() });

export function loader(_: Route.LoaderArgs) {
	return Response.json({ message: "nothing to see here" });
}

export async function action({ request }: Route.ActionArgs) {
	const parsed = bodySchema.safeParse(await request.json());

	if (!parsed.success) {
		return Response.json({
			received: true,
			status: "failed",
			message: "invalid request body",
		});
	}

	if (parsed.data.apiKey !== env.CRON_API_KEY) {
		return Response.json({
			received: true,
			status: "failed",
			message: "invalid api key",
		});
	}

	if (!isTelegramConfigured()) {
		return Response.json({
			received: true,
			sent: false,
			message: "telegram not configured",
		});
	}

	// Window on createdAt (arrival on this board), not postedAt (source-site
	// date): the digest announces what is NEW here. Published only — pending
	// direct posts would otherwise leak to the channel before review.
	const where = and(gte(job.createdAt, WINDOW), eq(job.status, "published"));

	const [jobs, total] = await Promise.all([
		db
			.select()
			.from(job)
			.where(where)
			.orderBy(desc(job.createdAt), desc(job.id))
			.limit(MAX_JOBS),
		db.$count(job, where),
	]);

	if (jobs.length === 0) {
		return Response.json({ received: true, sent: false, count: 0 });
	}

	// Direct posts link to their on-site page (shareable, indexable);
	// scraped jobs link straight out.
	const rows = jobs.flatMap((j) => {
		const path = sharePath(j);
		return path ? [{ j, path }] : [];
	});

	const lines = rows.map(({ j, path }, i) => {
		const href = path.startsWith("/") ? `${SITE_URL}${path}` : path;
		const meta = [j.company, j.source].filter(Boolean).join(" · ");
		const title = `<a href="${escapeHtml(href)}">${escapeHtml(j.title)}</a>`;
		return `${i + 1}. ${title}${meta ? ` — ${escapeHtml(meta)}` : ""}`;
	});

	const footer =
		total > jobs.length
			? `+${total - jobs.length} more → ${SITE_URL}`
			: `View all → ${SITE_URL}`;

	const text = [
		`<b>${total} new tech job${total === 1 ? "" : "s"} today</b>`,
		"",
		...lines,
		"",
		footer,
	].join("\n");

	const result = await sendTelegramMessage(text);
	if (!result.ok) {
		return Response.json(
			{ received: true, sent: false, message: result.error },
			{ status: 502 },
		);
	}

	return Response.json({ received: true, sent: true, count: jobs.length });
}
