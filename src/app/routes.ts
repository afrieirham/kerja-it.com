import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("home/home.tsx"),
  route("api/cron", "api/cron-insert.ts"),
] satisfies RouteConfig;
