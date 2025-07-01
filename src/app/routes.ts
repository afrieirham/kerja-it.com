import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("home.tsx"),
  route("dashboard", "dashboard/dashboard.tsx"),
  route("dashboard/:jobId/edit", "dashboard/edit-job.tsx"),
  route("profile", "profile.tsx"),
  route("api/cron", ".server/cron-insert.ts"),
  route("api/stripe/webhook", ".server/stripe-webhook.ts"),
] satisfies RouteConfig;
