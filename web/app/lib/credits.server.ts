import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "~/db";
import { job, jobOrder } from "~/db/schema";

/**
 * Paid-post credit balance: credits granted by paid orders minus paid posts
 * submitted. Computed, never stored — deleting a paid post (e.g. a rejected
 * submission) frees its credit automatically, which is exactly the
 * rejection-refund policy.
 */
export async function getCreditBalance(userId: string): Promise<number> {
	const [granted, used] = await Promise.all([
		db
			.select({
				total: sql<number>`coalesce(sum(${jobOrder.packPosts}), 0)`,
			})
			.from(jobOrder)
			.where(and(eq(jobOrder.userId, userId), eq(jobOrder.status, "paid"))),
		db.$count(job, and(eq(job.postedById, userId), eq(job.isPaid, true))),
	]);

	return Number(granted[0]?.total ?? 0) - used;
}

/**
 * The free tier: one ACTIVE standard post per account — pending review or
 * published. (Rejected/deleted posts no longer exist, so they don't count.)
 */
export async function hasActiveFreePost(userId: string): Promise<boolean> {
	const count = await db.$count(
		job,
		and(
			eq(job.postedById, userId),
			eq(job.isPaid, false),
			inArray(job.status, ["pending", "published"]),
		),
	);
	return count > 0;
}
