import { data, redirect } from "react-router";
import Stripe from "stripe";

import type { Route } from "./+types/create-checkout-session";
import { env } from "@/env";
import { getBaseUrl } from "@/lib/utils";

export function loader(_: Route.LoaderArgs) {
  return Response.json({ message: "nothing to see here" });
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ message: "method not allowed" }, { status: 405 });
  }

  const baseUrl = getBaseUrl();

  const formData = await request.formData();

  const priceId = formData.get("priceId")?.toString();
  const email = formData.get("email")?.toString();

  if (!email || !priceId) {
    console.log("email and priceId is required");
    return;
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const { url } = await stripe.checkout.sessions.create({
    mode: "payment",
    cancel_url: `${baseUrl}/dashboard`,
    success_url: `${baseUrl}/dashboard`,
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    customer_creation: "always",
  });

  if (!url) {
    console.log("cannot create stripe checkout session");
    return;
  }

  return redirect(url);
}
