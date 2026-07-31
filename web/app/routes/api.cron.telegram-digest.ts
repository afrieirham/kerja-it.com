import { desc, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/db";
import { job } from "~/db/schema";
import { env } from "~/env.server";
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
	// date): the digest announces what is NEW here.
	const where = gte(job.createdAt, WINDOW);

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

	const lines = jobs.map((j, i) => {
		const meta = [j.company].filter(Boolean).join(" · ");
		const title = `<a href="${escapeHtml(j.url)}">${escapeHtml(j.title)}</a>`;
		return `${i + 1}. ${title}${meta ? ` — ${escapeHtml(meta)}` : ""}\n`;
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
