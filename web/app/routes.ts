import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("sign-in", "routes/sign-in.tsx"),
	route("post-a-job", "routes/post-a-job.tsx"),
	route("admin", "routes/admin.tsx"),
	route("robots.txt", "routes/robots.txt.ts"),
	route("sitemap.xml", "routes/sitemap.xml.ts"),
	route("api/auth/*", "routes/api.auth.$.ts"),
	route("api/cron/save-jobs", "routes/api.cron.save-jobs.ts"),
	route("api/cron/telegram-digest", "routes/api.cron.telegram-digest.ts"),
] satisfies RouteConfig;
