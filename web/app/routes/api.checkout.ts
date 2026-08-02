import { redirect } from "react-router";
import { getSession } from "~/lib/auth.server";
import { findPack } from "~/lib/job-packs";
import { stripe } from "~/lib/stripe.server";
import type { Route } from "./+types/api.checkout";

export function loader(_: Route.LoaderArgs) {
	return Response.json({ message: "nothing to see here" });
}

export async function action({ request }: Route.ActionArgs) {
	const session = await getSession(request);
	if (!session) {
		throw redirect(`/sign-in?redirect=${encodeURIComponent("/pricing")}`);
	}
	if (!stripe) {
		return Response.json({ error: "payments not configured" }, { status: 503 });
	}

	const formData = await request.formData();

	const pack = findPack(String(formData.get("pack") ?? ""));
	if (!pack) return Response.json({ error: "unknown pack" }, { status: 400 });

	const email = String(formData.get("email") ?? "");
	if (!email) return Response.json({ error: "invalid email" }, { status: 400 });

	const origin = new URL(request.url).origin;
	const checkout = await stripe.checkout.sessions.create({
		mode: "payment",
		line_items: [
			{
				quantity: 1,
				price_data: {
					currency: "myr",
					unit_amount: pack.priceCents,
					product_data: {
						name: `${pack.posts} featured job post${pack.posts > 1 ? "s" : ""} — Kerja-IT.com`,
					},
				},
			},
		],
		customer_email: email,
		// Webhook attributes the purchase to this account.
		client_reference_id: session.user.id,
		metadata: { packId: pack.id },
		success_url: `${origin}/dashboard?checkout=success`,
		cancel_url: `${origin}/pricing`,
	});

	if (!checkout.url) {
		return Response.json({ error: "checkout failed" }, { status: 502 });
	}
	throw redirect(checkout.url);
}
