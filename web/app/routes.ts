import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("robots.txt", "routes/robots.txt.ts"),
	route("sitemap.xml", "routes/sitemap.xml.ts"),
	route("api/cron/save-jobs", "routes/api.cron.save-jobs.ts"),
] satisfies RouteConfig;
