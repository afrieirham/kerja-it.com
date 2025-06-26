import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("home/index.tsx"),
  route("api/cron", "api/cron-insert.ts"),
  route("api/trpc/*", "api/trpc.ts"),
] satisfies RouteConfig;
