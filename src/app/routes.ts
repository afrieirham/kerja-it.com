import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("home.tsx"),
  route("dashboard", "dashboard/dashboard.tsx"),
  route("dashboard/:jobId/edit", "dashboard/edit-job.tsx"),
  route("api/cron/save-jobs", "api/cron/save-jobs.ts"),
  route("api/cron/free-credit", "api/cron/reset-free-credit.ts"),
  route("api/stripe/webhook", "api/stripe/stripe-webhook.ts"),
  route("api/stripe/checkout", "api/stripe/create-checkout-session.ts"),
] satisfies RouteConfig;
