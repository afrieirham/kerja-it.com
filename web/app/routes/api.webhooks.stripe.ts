import type Stripe from "stripe";
import { db } from "~/db";
import { jobOrder } from "~/db/schema";
import { env } from "~/env.server";
import { findPack } from "~/lib/job-packs";
import { stripe } from "~/lib/stripe.server";
import type { Route } from "./+types/api.webhooks.stripe";

export function loader(_: Route.LoaderArgs) {
	return Response.json({ message: "nothing to see here" });
}

export async function action({ request }: Route.ActionArgs) {
	if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
		return Response.json({ received: false }, { status: 503 });
	}

	const signature = request.headers.get("stripe-signature");
	if (!signature) return Response.json({ received: false }, { status: 400 });

	let event: Stripe.Event;
	try {
		// Raw body required — any parsing before verification breaks it.
		event = stripe.webhooks.constructEvent(
			await request.text(),
			signature,
			env.STRIPE_WEBHOOK_SECRET,
		);
	} catch (error) {
		console.error("stripe webhook: bad signature", error);
		return Response.json({ received: false }, { status: 400 });
	}

	if (event.type === "checkout.session.completed") {
		const s = event.data.object;
		const pack = findPack(String(s.metadata?.packId ?? ""));
		const userId = s.client_reference_id;

		if (pack && userId && s.payment_status === "paid") {
			// The unique index on stripeSessionId makes replays safe.
			await db
				.insert(jobOrder)
				.values({
					stripeSessionId: s.id,
					userId,
					packPosts: pack.posts,
					amountCents: pack.priceCents,
					status: "paid",
				})
				.onConflictDoNothing({ target: jobOrder.stripeSessionId });
		}
	}

	return Response.json({ received: true });
}
