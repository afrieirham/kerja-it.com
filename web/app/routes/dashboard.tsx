import { and, desc, eq } from "drizzle-orm";
import { Form, Link, redirect } from "react-router";
import { Badge } from "~/components/core/badge";
import { Button } from "~/components/core/button";
import { Input } from "~/components/core/input";
import { Table, TableBody, TableCell, TableRow } from "~/components/core/table";
import { Header } from "~/components/widget/header";
import { db } from "~/db";
import { companyProfile, job } from "~/db/schema";
import { getSession } from "~/lib/auth.server";
import { getCreditBalance } from "~/lib/credits.server";
import { buildMeta, SITE_NAME } from "~/lib/seo";
import type { Route } from "./+types/dashboard";

export function meta() {
	return buildMeta({
		title: `Dashboard | ${SITE_NAME}`,
		path: "/dashboard",
		noindex: true,
	});
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
	dateStyle: "medium",
	timeZone: "UTC",
});

function parseCreatedAt(createdAt: string) {
	return new Date(`${createdAt.replace(" ", "T")}Z`);
}

export async function loader({ request }: Route.LoaderArgs) {
	const session = await getSession(request);
	if (!session) {
		throw redirect(`/sign-in?redirect=${encodeURIComponent("/dashboard")}`);
	}

	const [profile, posts, balance] = await Promise.all([
		db
			.select()
			.from(companyProfile)
			.where(eq(companyProfile.userId, session.user.id))
			.limit(1),
		db
			.select({
				id: job.id,
				title: job.title,
				status: job.status,
				slug: job.slug,
				isPaid: job.isPaid,
				featuredUntil: job.featuredUntil,
				createdAt: job.createdAt,
			})
			.from(job)
			.where(eq(job.postedById, session.user.id))
			.orderBy(desc(job.createdAt)),
		getCreditBalance(session.user.id),
	]);

	return {
		profile: profile[0] ?? null,
		posts,
		balance,
		checkout: new URL(request.url).searchParams.get("checkout"),
	};
}

export async function action({ request }: Route.ActionArgs) {
	const session = await getSession(request);
	if (!session) return { error: "You must be signed in." };

	const form = await request.formData();
	const intent = String(form.get("intent") ?? "");

	if (intent === "save-profile") {
		const name = String(form.get("name") ?? "").trim();
		const website = String(form.get("website") ?? "").trim();

		if (name.length < 2 || name.length > 120) {
			return { error: "Company name must be 2–120 characters." };
		}
		if (website && (!website.startsWith("https://") || website.length > 300)) {
			return { error: "Website must be a valid https:// URL." };
		}

		await db
			.insert(companyProfile)
			.values({ userId: session.user.id, name, website: website || null })
			.onConflictDoUpdate({
				target: companyProfile.userId,
				set: {
					name,
					website: website || null,
					updatedAt: new Date().toISOString(),
				},
			});
		return { saved: true };
	}

	if (intent === "delete-post") {
		const id = String(form.get("id") ?? "");
		if (id) {
			// postedById in the where: you can only delete your own posts.
			await db
				.delete(job)
				.where(and(eq(job.id, id), eq(job.postedById, session.user.id)));
		}
		return { deleted: true };
	}

	return { error: "Unknown action." };
}

function statusBadge(j: { status: string; featuredUntil: string | null }): {
	label: string;
	featured: boolean;
} {
	if (j.status === "pending")
		return { label: "Pending review", featured: false };
	const featured = Boolean(
		j.featuredUntil && parseCreatedAt(j.featuredUntil).getTime() > Date.now(),
	);
	if (featured) {
		return {
			label: `Featured till ${dateFormatter.format(parseCreatedAt(j.featuredUntil ?? ""))}`,
			featured: true,
		};
	}
	return { label: "Live", featured: false };
}

export default function Dashboard({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { profile, posts, balance, checkout } = loaderData;

	return (
		<div className="px-4">
			<Header />
			<main className="container mx-auto max-w-2xl space-y-8 py-8">
				<h1 className="text-xl font-semibold">Dashboard</h1>

				{checkout === "success" && (
					<p className="border border-green-600/30 bg-green-600/10 px-3 py-2 text-green-700 text-xs dark:text-green-400">
						Payment received — your credits will show below within a few
						seconds.
					</p>
				)}
				{actionData && "error" in actionData && actionData.error && (
					<p className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-xs">
						{actionData.error}
					</p>
				)}

				<section className="space-y-3">
					<h2 className="font-medium">Company profile</h2>
					<p className="text-muted-foreground text-xs">
						Prefills the company field when you post a job.
					</p>
					<Form method="post" className="flex items-end gap-2">
						<input type="hidden" name="intent" value="save-profile" />
						<div className="flex-1 space-y-1">
							<label htmlFor="name" className="text-xs font-medium">
								Company name
							</label>
							<Input
								id="name"
								name="name"
								required
								minLength={2}
								maxLength={120}
								defaultValue={profile?.name ?? ""}
								placeholder="Acme Sdn Bhd"
							/>
						</div>
						<div className="flex-1 space-y-1">
							<label htmlFor="website" className="text-xs font-medium">
								Website (optional)
							</label>
							<Input
								id="website"
								name="website"
								type="url"
								maxLength={300}
								defaultValue={profile?.website ?? ""}
								placeholder="https://acme.com"
							/>
						</div>
						<Button type="submit" variant="outline">
							Save
						</Button>
					</Form>
				</section>

				<section className="space-y-3">
					<h2 className="font-medium">Featured post credits</h2>
					<p className="text-sm">
						Balance: <span className="font-semibold">{balance}</span>
					</p>
					<Button variant="outline" size="sm">
						<Link to="/pricing">Get more credits</Link>
					</Button>
				</section>

				<section className="space-y-3">
					<h2 className="font-medium">My posts</h2>
					{posts.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No posts yet.{" "}
							<Link
								to="/post-a-job"
								className="underline hover:text-foreground"
							>
								Post your first job free
							</Link>
							.
						</p>
					) : (
						<Table>
							<TableBody>
								{posts.map((j) => {
									const badge = statusBadge(j);
									const live = j.status === "published" && j.slug;
									return (
										<TableRow key={j.id}>
											<TableCell>
												{live ? (
													<Link
														to={`/jobs/${j.slug}`}
														className="font-medium hover:underline"
													>
														{j.title}
													</Link>
												) : (
													<span className="font-medium">{j.title}</span>
												)}
											</TableCell>
											<TableCell>
												<Badge
													variant={badge.featured ? "default" : "secondary"}
												>
													{badge.label}
												</Badge>
											</TableCell>
											<TableCell className="text-muted-foreground whitespace-nowrap">
												{dateFormatter.format(parseCreatedAt(j.createdAt))}
											</TableCell>
											<TableCell className="text-right">
												<Form method="post">
													<input
														type="hidden"
														name="intent"
														value="delete-post"
													/>
													<input type="hidden" name="id" value={j.id} />
													<Button size="xs" variant="destructive" type="submit">
														Delete
													</Button>
												</Form>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</section>
			</main>
		</div>
	);
}
