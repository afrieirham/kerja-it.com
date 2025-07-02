import { href, Link, redirect, useFetcher } from "react-router";

import { getAuth } from "@clerk/react-router/ssr.server";
import type { VariantProps } from "class-variance-authority";
import { Loader2, Plus } from "lucide-react";

import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button, type buttonVariants } from "@/components/ui/button";
import { createNewJob, getAllMyJob } from "@/server/queries/jobs";
import {
  decrementFreeCreditByOne,
  decrementPremiumCreditByOne,
  syncUserData,
} from "@/server/queries/recruiter";
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

  const data = await syncUserData({ clerkId: clerk.userId });
  const jobs = await getAllMyJob({ id: clerk.userId });

  return { ...data, jobs };
}

export async function action(args: Route.ActionArgs) {
  const clerk = await getAuth(args);

  if (!clerk.userId) {
    return redirect("/");
  }

  const { request } = args;
  const formData = await request.formData();
  const intent = formData.get("intent");

  switch (intent) {
    case "create-premium-job": {
      const { jobId } = await createNewJob({
        userId: clerk.userId,
        premium: true,
      });
      await decrementPremiumCreditByOne({ userId: clerk.userId });
      return redirect(href("/dashboard/:jobId/edit", { jobId }));
    }

    case "create-free-job": {
      const { jobId } = await createNewJob({
        userId: clerk.userId,
        premium: false,
      });
      await decrementFreeCreditByOne({ userId: clerk.userId });
      return redirect(href("/dashboard/:jobId/edit", { jobId }));
    }

    default:
      return;
  }
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { freeCredit, premiumCredit, email, jobs } = loaderData;

  const {
    VITE_STRIPE_PRICE_A_ID,
    VITE_STRIPE_PRICE_B_ID,
    VITE_STRIPE_PRICE_C_ID,
  } = import.meta.env;

  const fetcher = useFetcher();

  return (
    <div className="mb-8">
      <Header />
      <div className="container mt-4 min-h-screen space-y-8 sm:space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <section className="flex flex-col items-stretch gap-8 md:flex-row">
          <div className="w-full space-y-2 border-t pt-4 sm:border sm:p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Quick Actions</p>
            </div>
            <div className="bg-white text-sm">
              <div className="flex items-center justify-center space-x-1 border bg-gray-50 p-4 text-black">
                <p>{premiumCredit} premium credit</p>
                <p>/</p>
                <p>{freeCredit} free posts</p>
              </div>
              <div className="mt-4 space-y-2">
                <p>Buy Premium Credit</p>
                <div className="flex items-center justify-between border p-3">
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
                <div className="flex items-center justify-between border p-3">
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
                <div className="flex items-center justify-between border border-gray-500 bg-gray-100 p-3">
                  <div className="flex items-center gap-2">
                    <p>5 Credit</p>
                    <Badge>Best Deal</Badge>
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
          <div className="w-full space-y-2 border-t pt-4 sm:border sm:p-4">
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
                  <li>
                    Option to hide salary info{" "}
                    <span className="text-xs text-gray-500">
                      (jobs with salary will be prioritized)
                    </span>
                  </li>
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
        </section>
        <section className="mt-4 flex flex-col items-stretch gap-8 sm:mt-8 md:flex-row">
          <div className="w-full space-y-2 border-t pt-4 sm:border sm:p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Premium Job Listings</p>
              <div className="space-x-2">
                <fetcher.Form method="post">
                  <input
                    type="hidden"
                    name="intent"
                    value="create-premium-job"
                  />
                  <Button
                    size="sm"
                    type="submit"
                    variant="default"
                    className="text-sm"
                  >
                    {fetcher.state !== "idle" &&
                    fetcher.formMethod === "POST" ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Plus />
                    )}
                    Create Job
                  </Button>
                </fetcher.Form>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4">
              {jobs
                .filter((job) => job.premium)
                .map((job) => (
                  <div
                    key={job.id}
                    className="flex w-full items-center justify-between gap-2 border p-4 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        className="w-12"
                        variant={job.live ? "default" : "outline"}
                      >
                        {job.live ? "Live" : "Draft"}
                      </Badge>
                      <p className="line-clamp-1">{job.title}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="minimal" size="minimal">
                        view
                      </Button>
                      <p>/</p>
                      <Button variant="minimal" size="minimal">
                        <Link
                          to={href("/dashboard/:jobId/edit", {
                            jobId: job.id,
                          })}
                        >
                          edit
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          <div className="w-full space-y-2 border-t pt-4 sm:border sm:p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Free Job Listings</p>
              <div className="space-x-2">
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="create-free-job" />
                  <Button
                    size="sm"
                    type="submit"
                    variant="default"
                    className="text-sm"
                  >
                    {fetcher.state !== "idle" &&
                    fetcher.formMethod === "POST" ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Plus />
                    )}
                    Create Job
                  </Button>
                </fetcher.Form>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4">
              {jobs
                .filter((job) => !job.premium)
                .map((job) => (
                  <div
                    key={job.id}
                    className="flex w-full items-center justify-between gap-2 border p-4 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        className="w-12"
                        variant={job.live ? "default" : "outline"}
                      >
                        {job.live ? "Live" : "Draft"}
                      </Badge>
                      <p className="line-clamp-1">{job.title}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="minimal" size="minimal">
                        view
                      </Button>
                      <p>/</p>
                      <Button variant="minimal" size="minimal">
                        <Link
                          to={href("/dashboard/:jobId/edit", { jobId: job.id })}
                        >
                          edit
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
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
    <fetcher.Form action={href("/api/stripe/checkout")} method="post">
      <input type="hidden" value={email} name="email" />
      <input type="hidden" value={priceId} name="priceId" />
      <Button className="w-10" type="submit" {...buttonProps}>
        {fetcher.state !== "idle" ? (
          <Loader2 className="animate-spin" />
        ) : (
          buttonText
        )}
      </Button>
    </fetcher.Form>
  );
}
