import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("home.tsx"),
  route("dashboard", "dashboard.tsx"),
  route("profile", "profile.tsx"),
  route("api/cron", "api/cron-insert.ts"),
] satisfies RouteConfig;
