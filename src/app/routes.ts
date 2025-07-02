import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("home.tsx"),
  route("dashboard", "dashboard/dashboard.tsx"),
  route("dashboard/:jobId/edit", "dashboard/edit-job.tsx"),
  route("api/cron/save-jobs", ".server/cron/save-jobs.ts"),
  route("api/cron/free-credit", ".server/cron/reset-free-credit.ts"),
  route("api/stripe/webhook", ".server/stripe/stripe-webhook.ts"),
  route("api/stripe/checkout", ".server/stripe/create-checkout-session.ts"),
] satisfies RouteConfig;
