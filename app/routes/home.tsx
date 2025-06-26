import { Form, NavLink } from "react-router";

import { formatDistanceToNowStrict } from "date-fns";
import parse from "html-react-parser";
import qs from "query-string";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllJobs } from "@/server/queries/jobs";
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

export async function loader({ request }: Route.LoaderArgs) {
  const url = qs.parseUrl(request.url);
  const searchTerm = (url.query.q || url.query.query) ?? "";

  const jobs = await getAllJobs({ searchTerm: String(searchTerm) });

  return { jobs, q: String(searchTerm) };
}

export default function Home(props: Route.ComponentProps) {
  const { jobs, q } = props.loaderData;

  return (
    <main className="mx-auto max-w-6xl p-4">
      <h1 className="text-xl">Kerja-IT.com</h1>
      <p className="text-sm">
        IT jobs in Malaysia sourced from various job boards.{" "}
        <span className="text-xs text-gray-500">
          (yes new simplified design)
        </span>
      </p>

      <Form className="mt-4 flex items-center gap-2">
        <Input
          name="q"
          placeholder="Search: Software Engineer"
          className="max-w-md"
          type="search"
          defaultValue={q}
        />
        <Button type="submit">Search</Button>
      </Form>
      <div className="mt-4 text-xs text-gray-500">
        <p>Total: {jobs?.length}</p>
      </div>
      <div className="mt-4">
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
              <p className="mt-2 text-sm text-gray-800 line-clamp-3">
                {parse(job.description)}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-800">No jobs found.</p>
        )}
      </div>
    </main>
  );
}
