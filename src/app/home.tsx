import { Suspense } from "react";
import { Await, href, Link } from "react-router";

import { formatDistanceToNowStrict } from "date-fns";
import parse from "html-react-parser";

import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  getAllExternalJobs,
  getAllLiveFreeJobs,
  getAllLivePremiumJobs,
} from "@/server/queries/jobs";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Kerja-IT.com | Tech Jobs in Malaysia" },
    {
      name: "description",
      content: "IT jobs in Malaysia sourced from various job boards.",
    },
  ];
}

export async function loader({}: Route.LoaderArgs) {
  const jobs = getAllExternalJobs({ searchTerm: "", page: 1, pageSize: 10 });
  const premiumJobs = await getAllLivePremiumJobs();
  const freeJobs = await getAllLiveFreeJobs();

  return { jobs, premiumJobs, freeJobs };
}

export default function Home(props: Route.ComponentProps) {
  const { jobs, premiumJobs, freeJobs } = props.loaderData;

  return (
    <div>
      <Header />
      <div className="container space-y-8 py-4">
        {premiumJobs.length > 0 && (
          <section>
            <p>Featured Jobs</p>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {premiumJobs.map((job) => (
                <div key={job.id} className="border bg-gray-100 p-4">
                  <a
                    href={job.applyUrl}
                    className="text-blue-500 visited:text-purple-900 hover:underline"
                  >
                    {job.title}
                  </a>
                  <p className="mt-2 line-clamp-6 text-sm sm:line-clamp-4">
                    {job.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {freeJobs.length > 0 && (
          <section>
            <p>More from our partner</p>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {freeJobs.map((job) => (
                <div key={job.id} className="border p-4">
                  <a
                    href={job.applyUrl}
                    className="text-blue-500 visited:text-purple-900 hover:underline"
                  >
                    {job.title}
                  </a>
                  <p className="mt-2 line-clamp-6 text-sm sm:line-clamp-4">
                    {job.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <Suspense fallback={<p className="text-sm">Loading...</p>}>
          <Await
            resolve={jobs}
            errorElement={
              <p className="mt-4 text-sm">
                Could not fetch jobs, please try again.
              </p>
            }
          >
            {(jobs) => (
              <section>
                <p>Collected from Top Sites</p>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  {jobs.map((job) => (
                    <div key={job.id} className="border p-4">
                      <p className="space-x-1.5">
                        <a
                          href={job.url}
                          target="_blank"
                          className="text-blue-500 visited:text-purple-900 hover:underline"
                        >
                          {parse(job.title)}
                        </a>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNowStrict(job.createdAt)}
                        </span>
                      </p>
                      <p className="mt-2 line-clamp-3 text-sm text-gray-800">
                        {parse(job.description)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={href("/across-the-web")}>Show more</Link>
                  </Button>
                </div>
              </section>
            )}
          </Await>
        </Suspense>
      </div>
    </div>
  );
}
