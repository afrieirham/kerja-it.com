import { randomBytes } from "node:crypto";

function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/**
 * "senior-frontend-engineer-acme-x7k2p9" — readable for SEO/CTR, and the
 * random hex suffix makes collisions effectively impossible without a
 * dedupe loop (callers retry once on the unique index anyway).
 */
export function generateJobSlug(title: string, company: string): string {
	const base = slugify(`${title}-${company}`).slice(0, 60).replace(/-+$/g, "");
	const suffix = randomBytes(3).toString("hex");
	return `${base}-${suffix}`;
}
