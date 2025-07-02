import { data } from "react-router";
import Stripe from "stripe";

import { env } from "@/env";
import { db } from "@/server/db";
import type { Route } from "./+types/stripe-webhook";

export function loader(_: Route.LoaderArgs) {
  return Response.json({ message: "nothing to see here" });
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ message: "method not allowed" }, { status: 405 });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return data({ message: "signature not valid" }, { status: 500 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      sig,
      webhookSecret,
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    // On error, log and return the error message.
    if (err) console.log(err);
    console.log(`❌ Error message: ${errorMessage}`);
    return data({ message: `Webhook Error: ${errorMessage}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const email = event.data.object.customer_email;
      if (!email) {
        console.log("user email not found");
        break;
      }

      const sessionId = event.data.object.id;
      if (!sessionId) {
        console.log("session id not found");
        break;
      }
      const { line_items } = await stripe.checkout.sessions.retrieve(
        sessionId,
        { expand: ["line_items.data.price.product"] },
      );
      const product = line_items?.data.at(0)?.price?.product;
      if (!product) {
        console.log("product not found");
        break;
      }
      const productId = typeof product === "string" ? product : product.id;

      const creditAmount = {
        [env.STRIPE_PRODUCT_A_ID]: 1,
        [env.STRIPE_PRODUCT_B_ID]: 3,
        [env.STRIPE_PRODUCT_C_ID]: 5,
      };

      await db.recruiter.update({
        where: { email },
        data: { premiumCredit: { increment: creditAmount[productId] } },
      });

      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return Response.json({ received: true });
}
