/* eslint-disable @typescript-eslint/no-base-to-string */
import { Suspense } from "react";
import {
  Await,
  href,
  Link,
  redirect,
  useFetcher,
  useNavigate,
} from "react-router";

import { Header } from "@/components/header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/server/db";
import { getJobById } from "@/server/queries/jobs";
import type { Route } from "./+types/edit-job";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Kerja-IT.com | Edit Job" },
    {
      name: "description",
      content: "IT jobs in Malaysia sourced from various job boards.",
    },
  ];
}

export async function loader(args: Route.LoaderArgs) {
  const job = getJobById({ id: args.params.jobId });

  return { job };
}

export async function action(args: Route.ActionArgs) {
  const formData = await args.request.formData();

  const title = String(formData.get("title"));
  const description = String(formData.get("description"));
  const applyUrl = String(formData.get("applyUrl"));
  const live = Boolean(String(formData.get("live")) === "on");

  await db.recruiterJob.update({
    where: { id: args.params.jobId },
    data: {
      title,
      description,
      applyUrl,
      live,
    },
  });

  return redirect(href("/dashboard"));
}

function AddJob({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const { job } = loaderData;

  return (
    <div>
      <Header />
      <div className="container mt-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={href("/dashboard")}>Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit Job</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Suspense fallback={<p className="mt-4 text-sm">Loading...</p>}>
          <Await
            resolve={job}
            errorElement={
              <p className="mt-4 text-sm">
                Could not fetch job detail, please try again.
              </p>
            }
          >
            {(job) => (
              <fetcher.Form
                method="post"
                className="mt-8 max-w-lg space-y-4 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Switch
                    name="live"
                    id="live"
                    defaultChecked={job?.live}
                    className="data-[state=checked]:bg-green-500"
                  />
                  <label htmlFor="live">Live</label>
                </div>
                <div className="flex flex-col gap-2">
                  <label>Title</label>
                  <Input defaultValue={job?.title} name="title" />
                </div>
                <div className="flex flex-col gap-2">
                  <label>Description</label>
                  <Textarea name="description">{job?.description}</Textarea>
                </div>
                <div className="flex flex-col gap-2">
                  <label>Apply URL</label>
                  <Input defaultValue={job?.applyUrl} name="applyUrl" />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit">
                    {fetcher.state !== "idle" ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => navigate(-1)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </fetcher.Form>
            )}
          </Await>
        </Suspense>
      </div>
    </div>
  );
}

export default AddJob;
