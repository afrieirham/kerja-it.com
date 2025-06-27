import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import type { Route } from "./+types/trpc";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

export const loader = async (args: Route.LoaderArgs) => {
  return handleRequest(args);
};

export const action = async (args: Route.ActionArgs) => {
  return handleRequest(args);
};

async function handleRequest(args: Route.LoaderArgs | Route.ActionArgs) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: args.request,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: args.request.headers }),
  });
}
