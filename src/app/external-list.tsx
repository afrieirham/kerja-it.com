import { Suspense } from "react";
import { Await, Form, href, Link } from "react-router";

import { formatDistanceToNowStrict } from "date-fns";
import parse from "html-react-parser";
import qs from "query-string";

import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllJobs } from "@/server/queries/jobs";
import type { Route } from "./+types/external-list";
import { EXTERNAL_LIST_PAGE_SIZE } from "@/config";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Kerja-IT.com | Across The Web" },
    {
      name: "description",
      content: "IT jobs in Malaysia sourced from various job boards.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = qs.parseUrl(request.url);

  const { q, query, p } = url.query;

  const searchTerm = q ?? query ?? "";
  const page = p ? Number(p) : 1;

  const jobs = getAllJobs({ searchTerm: String(searchTerm), page });

  return { jobs, q: String(searchTerm), page };
}

export default function ExternalBoard(props: Route.ComponentProps) {
  const { jobs, q, page } = props.loaderData;

  return (
    <div>
      <Header />
      <div className="container mb-8">
        <Form className="mt-4 flex items-center gap-2">
          <Input
            name="q"
            placeholder="Search: Software Engineer"
            className="max-w-md"
            type="search"
            defaultValue={q}
          />
          <Button type="submit">Search</Button>
          {!!q && (
            <Button variant="ghost" asChild>
              <Link to={href("/across-the-web")} reloadDocument>
                Reset
              </Link>
            </Button>
          )}
        </Form>

        <Suspense fallback={<p className="mt-4 text-sm">Loading...</p>}>
          <Await
            resolve={jobs}
            errorElement={
              <p className="mt-4 text-sm">
                Could not fetch jobs, please try again.
              </p>
            }
          >
            {(jobs) => (
              <>
                <div className="mt-4">
                  <p className="text-xs text-gray-500">
                    Showing {jobs.length} jobs
                  </p>
                </div>

                <main className="mt-4">
                  {jobs.length > 0 ? (
                    jobs.map((job) => (
                      <div key={job.id} className="mb-8">
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
                    ))
                  ) : (
                    <p className="text-sm text-gray-800">No jobs found.</p>
                  )}
                  <div>
                    <PaginationButton
                      q={q}
                      page={page}
                      itemLength={jobs.length}
                    />
                  </div>
                </main>
              </>
            )}
          </Await>
        </Suspense>
      </div>
    </div>
  );
}

function PaginationButton({
  q,
  page,
  itemLength,
}: {
  q: string;
  page: number;
  itemLength: number;
}) {
  if (itemLength === 0) return null;

  return (
    <div className="mx-auto flex w-full items-center gap-4 text-sm">
      <Form>
        {q && <input type="hidden" name="q" value={q} />}
        <input type="hidden" name="p" value={page - 1} />

        <button
          type="submit"
          disabled={page === 1}
          className="cursor-pointer hover:underline disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:no-underline"
        >
          prev
        </button>
      </Form>
      <Form>
        {q && <input type="hidden" name="q" value={q} />}
        <input type="hidden" name="p" value={page + 1} />

        <button
          type="submit"
          disabled={itemLength !== EXTERNAL_LIST_PAGE_SIZE}
          className="cursor-pointer hover:underline disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:no-underline"
        >
          next
        </button>
      </Form>
    </div>
  );
}
