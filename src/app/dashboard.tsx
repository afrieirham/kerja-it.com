/* eslint-disable @typescript-eslint/no-base-to-string */
import { redirect, useFetcher } from "react-router";

import { getAuth } from "@clerk/react-router/ssr.server";
import type { VariantProps } from "class-variance-authority";
import Stripe from "stripe";

import { Header } from "@/components/header";
import { Button, type buttonVariants } from "@/components/ui/button";
import { env } from "@/env";
import { clerkClient } from "@/server/auth";
import { db } from "@/server/db";
import type { Route } from "./+types/dashboard";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Kerja-IT.com | Dashboard" },
    {
      name: "description",
      content: "IT jobs in Malaysia sourced from various job boards.",
    },
  ];
}

export async function loader(args: Route.LoaderArgs) {
  const clerk = await getAuth(args);

  if (!clerk.userId) {
    return redirect("/");
  }

  const user = await db.recruiter.findFirst({ where: { id: clerk.userId } });
  if (!user) {
    const clerkUser = await clerkClient.users.getUser(clerk.userId);
    let credit = 0;
    let email = "";
    if (clerkUser.primaryEmailAddress) {
      const user = await db.recruiter.upsert({
        where: { id: clerk.userId },
        create: {
          id: clerk.userId,
          email: clerkUser.primaryEmailAddress.emailAddress,
        },
        update: { email: clerkUser.primaryEmailAddress.emailAddress },
      });
      credit = user.jobCredit;
      email = user.email;
    }
    return { credit, email };
  }

  return { credit: user.jobCredit, email: user.email };
}

export async function action({ request }: Route.ActionArgs) {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  const formData = await request.formData();
  const priceId = formData.get("priceId")?.toString();
  const email = formData.get("email")?.toString();

  if (!email || !priceId) {
    console.log("email and priceId is required");
    return;
  }

  const { url } = await stripe.checkout.sessions.create({
    mode: "payment",
    cancel_url: "http://localhost:5173/dashboard",
    success_url: "http://localhost:5173/dashboard",
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

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { credit, email } = loaderData;
  const {
    VITE_STRIPE_PRICE_A_ID,
    VITE_STRIPE_PRICE_B_ID,
    VITE_STRIPE_PRICE_C_ID,
  } = import.meta.env;

  return (
    <div className="mx-auto max-w-6xl p-4">
      <Header />
      <div className="mt-8 space-y-8">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Purchase Job Credits</p>
          </div>
          <div className="mt-2 mb-16 w-full border bg-gray-50 p-4">
            <StripeButton
              email={email}
              priceId={VITE_STRIPE_PRICE_A_ID}
              buttonText="Buy 1 Credit"
              buttonProps={{ variant: "minimal", size: "minimal" }}
            />
            <StripeButton
              email={email}
              priceId={VITE_STRIPE_PRICE_B_ID}
              buttonText="Buy 3 Credit"
              buttonProps={{ variant: "minimal", size: "minimal" }}
            />
            <StripeButton
              email={email}
              priceId={VITE_STRIPE_PRICE_C_ID}
              buttonText="Buy 5 Credit"
              buttonProps={{ variant: "minimal", size: "minimal" }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Dashboard</p>
            <div className="flex items-center space-x-1">
              <Button variant="minimal" size="minimal">
                {credit} premium credit
              </Button>
              <p>/</p>
              <Button variant="minimal" size="minimal">
                2 free posts
              </Button>
            </div>
          </div>

          <div className="mt-2 max-w-md space-y-4 border bg-gray-50 p-4 text-sm">
            <div>
              <p>How to post jobs</p>
              <ul className="list-inside list-disc">
                <li>
                  You can either post a <u>free listing</u> or{" "}
                  <u>premium listing</u>
                </li>
                <li>Premium listing requires at least 1 credit</li>
                <li>All listing will be hidden after 6 months</li>
              </ul>
            </div>
            <div>
              <p>Premium listing</p>
              <ul className="list-inside list-disc">
                <li>Requires 1 credit per job listing</li>
                <li>Credit can be used anytime</li>
                <li>Premium jobs will be featured for 30 days</li>
              </ul>
            </div>
            <div>
              <p>Free listing</p>
              <ul className="list-inside list-disc">
                <li>Will be pinned below premium listing for 7 days</li>
                <li>Does not require any credit</li>
                <li>Only 2 listing per month</li>
                <li>Must share salary info</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StripeButton({
  buttonProps,
  email,
  priceId,
  buttonText,
}: {
  email: string;
  priceId: string;
  buttonText: string;
  buttonProps: React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants>;
}) {
  const fetcher = useFetcher();
  return (
    <fetcher.Form method="post">
      <input type="hidden" value={email} name="email" />
      <input type="hidden" value={priceId} name="priceId" />
      <Button type="submit" {...buttonProps}>
        {fetcher.state !== "idle" ? "Loading" : buttonText}
      </Button>
    </fetcher.Form>
  );
}
