// One-off backfill for the write-time extraction columns, scoped to the
// last 3 months. Idempotent — safe to re-run. From web/:
//
//   DATABASE_URL=<prod-url> npx tsx scripts/backfill-extract.ts
//
// (Shell env wins over the dotenv-loaded .env.)
import { eq, gte, sql } from "drizzle-orm";
import { db } from "~/db";
import { job } from "~/db/schema";
import { extractJob } from "~/lib/job-extract.server";

const CHUNK_SIZE = 100;
const LOG_EVERY = 500;

const runner = async () => {
	const rows = await db
		.select({ id: job.id, title: job.title, description: job.description })
		.from(job)
		// Same window as the home listing — older rows are never displayed.
		.where(gte(job.createdAt, sql`CURRENT_TIMESTAMP - INTERVAL '3 months'`));

	console.log(`backfilling ${rows.length} jobs (last 3 months)`);
	let done = 0;

	for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
		const chunk = rows.slice(i, i + CHUNK_SIZE);
		await Promise.all(
			chunk.map((row) => {
				const extracted = extractJob({ ...row, source: "" });
				return db
					.update(job)
					.set({
						title: extracted.title,
						description: extracted.description,
						location: extracted.location,
						role: extracted.role,
						seniority: extracted.seniority,
						salary: extracted.salary,
						// Conditional sets, so re-runs don't wipe values that are
						// no longer re-derivable from the cleaned row: title
						// parsing consumes the " | company" suffix on pass one, and
						// description cleaning strips the same-day
						// "Dipaparkan h:mm:ss PG|PTG." prefix.
						...(extracted.company ? { company: extracted.company } : {}),
						...(extracted.postedAt
							? { postedAt: extracted.postedAt.toISOString() }
							: {}),
					})
					.where(eq(job.id, row.id));
			}),
		);
		done += chunk.length;
		if (done % LOG_EVERY < CHUNK_SIZE) {
			console.log(`${done}/${rows.length}`);
		}
	}

	console.log("done");
	// The postgres client keeps the event loop alive.
	process.exit(0);
};

runner();
