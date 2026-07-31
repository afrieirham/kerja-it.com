import { z } from "zod";
import { db } from "~/db";
import { job } from "~/db/schema";
import { env } from "~/env.server";
import { extractJob } from "~/lib/job-extract.server";
import type { Route } from "./+types/api.cron.save-jobs";

const bodySchema = z.object({
	apiKey: z.string(),
	input: z.array(
		z.object({
			url: z.string(),
			title: z.string(),
			description: z.string(),
			source: z.string(),
		}),
	),
});

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

	const body = parsed.data;

	if (body.apiKey !== env.CRON_API_KEY) {
		return Response.json({
			received: true,
			status: "failed",
			message: "invalid api key",
		});
	}

	if (body.input.length > 0) {
		// Raw text in (old scrapers keep working); extraction/cleaning at write.
		const values = body.input.map((item) => {
			const extracted = extractJob(item);
			return {
				url: item.url,
				source: item.source,
				title: extracted.title,
				description: extracted.description,
				company: extracted.company,
				location: extracted.location,
				role: extracted.role,
				seniority: extracted.seniority,
				salary: extracted.salary,
				postedAt: extracted.postedAt?.toISOString() ?? null,
			};
		});

		const inserted = await db
			.insert(job)
			.values(values)
			.onConflictDoNothing({ target: job.url })
			.returning({ id: job.id });

		return Response.json({ received: true, count: inserted.length });
	}

	return Response.json({ received: true, count: 0 });
}
