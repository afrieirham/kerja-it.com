import { env } from "@/env";
import { db } from "@/server/db";
import type { Route } from "./+types/reset-free-credit";

export function loader(_: Route.LoaderArgs) {
  return Response.json({ message: "nothing to see here" });
}

export async function action({ request }: Route.ActionArgs) {
  const body = (await request.json()) as { apiKey: string };

  if (body.apiKey !== env.CRON_API_KEY) {
    return Response.json({
      received: true,
      status: "failed",
      message: "invalid api key",
    });
  }

  await db.recruiter.updateMany({ data: { freeCredit: 2 } });
  return Response.json({ received: true });
}
