import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

import { Header } from "@/components/header";
import { clerkClient } from "@/server/auth";
import { db } from "@/server/db";
import type { Route } from "./+types/dashboard";

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

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { credit, email } = loaderData;

  return (
    <div className="mx-auto max-w-6xl p-4">
      <Header />
      <div className="mt-8 space-y-8">
        <div>
          <p className="text-sm font-bold">Recruiter Dashboard</p>
          <div className="mt-2 max-w-md border bg-gray-50 p-4 text-sm">
            <p className="font-bold">How to post a job?</p>
            <p className="mt-2 text-sm">
              You can either post a free listing or premium listing. Premium
              listing requires at least 1 credit.
            </p>
            <p className="my-6">You have {credit} job listing credits.</p>
            <ul className="list-inside list-disc">
              <li>Credit can be used anytime.</li>
              <li>All job listing will be deleted after 6 months.</li>
              <li>Premium jobs will be featured for 30 days.</li>
            </ul>
          </div>
        </div>
        <div>
          <p className="text-sm font-bold">
            Choose your preferred package below
          </p>
          <PricingTable
            className="mt-2 sm:border sm:p-8"
            pricingTableId={import.meta.env.VITE_STRIPE_PRICING_TABLE_ID}
            publishableKey={import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY}
            userEmail={email}
          />
        </div>
      </div>
    </div>
  );
}

function PricingTable({
  pricingTableId,
  publishableKey,
  className,
  userEmail,
}: {
  className?: string;
  userEmail: string;
  pricingTableId: string;
  publishableKey: string;
}) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{
        __html: `<script async src="https://js.stripe.com/v3/pricing-table.js"></script><stripe-pricing-table pricing-table-id="${pricingTableId}" publishable-key="${publishableKey}" customer-email="${userEmail}"></stripe-pricing-table>`,
      }}
    />
  );
}
