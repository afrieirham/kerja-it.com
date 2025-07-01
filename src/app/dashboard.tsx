/* eslint-disable @typescript-eslint/no-base-to-string */
import { redirect, useFetcher } from "react-router";

import { getAuth } from "@clerk/react-router/ssr.server";
import type { VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
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
    <div>
      <Header />
      <div className="container min-h-screen">
        <div className="mt-4 flex flex-col items-stretch gap-8 sm:mt-8 md:flex-row">
          <div className="w-full space-y-2 sm:border sm:p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Quick Actions</p>
            </div>
            <div className="bg-white text-sm">
              <div className="flex items-center justify-center space-x-1 border bg-gray-50 p-4 text-black">
                <p>{credit} premium credit</p>
                <p>/</p>
                <p>2 free posts</p>
              </div>
              <div className="mt-4 space-y-2">
                <p>Buy Premium Credit</p>
                <div className="flex items-center justify-between border p-2">
                  <p>1 Credit</p>
                  <div className="flex items-center gap-2">
                    <p>MYR 49</p>
                    <StripeButton
                      email={email}
                      priceId={VITE_STRIPE_PRICE_A_ID}
                      buttonText="Buy"
                      buttonProps={{ variant: "outline", size: "sm" }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between border p-2">
                  <p>3 Credit</p>
                  <div className="flex items-center gap-2">
                    <p>MYR 99</p>
                    <StripeButton
                      email={email}
                      priceId={VITE_STRIPE_PRICE_B_ID}
                      buttonText="Buy"
                      buttonProps={{ variant: "outline", size: "sm" }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between border border-gray-500 bg-gray-100 p-2">
                  <div className="flex items-center gap-2">
                    <p>5 Credit</p>
                    <p className="bg-gray-800 px-2 py-0.5 text-xs text-white">
                      Best Deal
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p>MYR 149</p>
                    <StripeButton
                      email={email}
                      priceId={VITE_STRIPE_PRICE_C_ID}
                      buttonText="Buy"
                      buttonProps={{ variant: "default", size: "sm" }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 border bg-gray-50 p-4 text-gray-500">
                <ul className="list-inside list-disc">
                  <li>Credits never expire once purchased</li>
                  <li>Use credits for premium job postings anytime</li>
                  <li>Bulk packages offer better value</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="w-full space-y-2 sm:border sm:p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">How Credit Works</p>
            </div>

            <div className="space-y-4 bg-white text-sm">
              <div>
                <p>Posting job</p>
                <ul className="list-inside list-disc">
                  <li>
                    You can either post a <u>free listing</u> or{" "}
                    <u>premium listing</u>
                  </li>
                  <li>Premium listing requires 1 credit per post</li>
                  <li>All listing will be hidden after 6 months</li>
                </ul>
              </div>
              <div>
                <p>Premium listing</p>
                <ul className="list-inside list-disc">
                  <li>Premium jobs will be featured for 30 days</li>
                  <li>Requires 1 credit per job listing</li>
                  <li>Option to hide salary info</li>
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
        {fetcher.state !== "idle" ? (
          <Loader2 className="animate-spin" />
        ) : (
          buttonText
        )}
      </Button>
    </fetcher.Form>
  );
}
