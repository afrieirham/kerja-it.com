import { env } from "env";
import type { Route } from "./+types/cron-insert";
import { db } from "@/server/db";

export function loader(_: Route.LoaderArgs) {
  return Response.json({ message: "nothing to see here" });
}

export async function action({ request }: Route.ActionArgs) {
  const body = (await request.json()) as {
    apiKey: string;
    input: {
      url: string;
      title: string;
      description: string;
      source: string;
    }[];
  };

  if (body.apiKey !== env.CRON_API_KEY) {
    return Response.json({
      received: true,
      status: "failed",
      message: "invalid api key",
    });
  }

  if (body.input.length > 0) {
    const data = await db.job.createMany({
      data: body.input,
      skipDuplicates: true,
    });
    return Response.json({ received: true, count: data.count });
  }

  return Response.json({ received: true, count: 0 });
}
