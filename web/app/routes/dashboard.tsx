import { and, desc, eq } from "drizzle-orm";
import { Form, Link, redirect, useSearchParams } from "react-router";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "~/components/core/alert-dialog";
import { Badge } from "~/components/core/badge";
import { Button } from "~/components/core/button";
import { Input } from "~/components/core/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/core/table";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "~/components/core/tabs";
import { Header } from "~/components/widget/header";
import { db } from "~/db";
import { companyProfile, job, jobOrder } from "~/db/schema";
import { getSession } from "~/lib/auth.server";
import { getCreditBalance, hasActiveFreePost } from "~/lib/credits.server";
import { ARRANGEMENT_OPTIONS, labelFor } from "~/lib/job-attributes";
import { JOB_LOCATIONS } from "~/lib/job-filters";
import { formatRM } from "~/lib/job-packs";
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

const DASHBOARD_TABS = ["overview", "listings", "billing", "profile"] as const;
type DashboardTab = (typeof DASHBOARD_TABS)[number];

export async function loader({ request }: Route.LoaderArgs) {
	const session = await getSession(request);
	if (!session) {
		// Keep the query string so ?tab= survives the sign-in round-trip.
		const url = new URL(request.url);
		throw redirect(
			`/sign-in?redirect=${encodeURIComponent(url.pathname + url.search)}`,
		);
	}

	const [profile, posts, balance, orders, freePostUsed] = await Promise.all([
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
				salary: job.salary,
				arrangement: job.arrangement,
				city: job.city,
				location: job.location,
				createdAt: job.createdAt,
			})
			.from(job)
			.where(eq(job.postedById, session.user.id))
			.orderBy(desc(job.createdAt)),
		getCreditBalance(session.user.id),
		// Paid orders only — pending/failed checkouts are not purchases.
		db
			.select({
				id: jobOrder.id,
				packPosts: jobOrder.packPosts,
				amountCents: jobOrder.amountCents,
				createdAt: jobOrder.createdAt,
			})
			.from(jobOrder)
			.where(
				and(eq(jobOrder.userId, session.user.id), eq(jobOrder.status, "paid")),
			)
			.orderBy(desc(jobOrder.createdAt)),
		hasActiveFreePost(session.user.id),
	]);

	return {
		profile: profile[0] ?? null,
		posts,
		balance,
		orders,
		freePostUsed,
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

/** One-line summary under the title: "RM5,000 / month · Hybrid · Bangsar, Kuala Lumpur". */
function postMeta(j: {
	salary: string | null;
	arrangement: string | null;
	city: string | null;
	location: string | null;
}): string {
	const parts: (string | null)[] = [
		j.salary,
		labelFor(ARRANGEMENT_OPTIONS, j.arrangement),
	];
	if (j.arrangement !== "remote") {
		const where = [j.city, labelFor(JOB_LOCATIONS.options, j.location)]
			.filter(Boolean)
			.join(", ");
		parts.push(where || null);
	}
	return parts.filter(Boolean).join(" · ");
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="border border-border p-3">
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className="mt-1 font-semibold text-sm">{value}</p>
		</div>
	);
}

export default function Dashboard({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { profile, posts, balance, orders, freePostUsed, checkout } =
		loaderData;
	const [searchParams, setSearchParams] = useSearchParams();
	const rawTab = searchParams.get("tab");
	const tab: DashboardTab = DASHBOARD_TABS.includes(rawTab as DashboardTab)
		? (rawTab as DashboardTab)
		: "overview";

	const liveCount = posts.filter((p) => p.status === "published").length;
	const pendingCount = posts.filter((p) => p.status === "pending").length;
	const creditsPurchased = orders.reduce((sum, o) => sum + o.packPosts, 0);
	const creditsUsed = posts.filter((p) => p.isPaid).length;

	return (
		<div className="px-4">
			<Header />
			<main className="container mx-auto max-w-4xl space-y-4 py-8">
				<h1 className="text-sm font-semibold">Dashboard</h1>

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

				<Tabs
					value={tab}
					onValueChange={(v) =>
						setSearchParams(
							{ tab: String(v) },
							{ replace: true, preventScrollReset: true },
						)
					}
					className="gap-4"
				>
					<TabsList variant="line">
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="billing">Billing</TabsTrigger>
						<TabsTrigger value="profile">Profile</TabsTrigger>
					</TabsList>

					<TabsContent value="overview" className="space-y-4 text-sm">
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
							<Stat label="Featured credits" value={String(balance)} />
							<Stat
								label="Free post"
								value={freePostUsed ? "Used" : "Available"}
							/>
							<Stat label="Live listings" value={String(liveCount)} />
							<Stat label="Pending review" value={String(pendingCount)} />
						</div>
						<div className="flex gap-2 justify-end">
							<Button variant="outline" render={<Link to="/pricing" />}>
								Get credits
							</Button>
							<Button render={<Link to="/post-a-job" />}>Post a job</Button>
						</div>
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
								<TableHeader>
									<TableRow>
										<TableHead>Listings</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Posted</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{posts.map((j) => {
										const badge = statusBadge(j);
										const live = j.status === "published" && j.slug;
										const meta = postMeta(j);
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
													{meta && (
														<p className="text-muted-foreground text-xs">
															{meta}
														</p>
													)}
												</TableCell>
												<TableCell>
													<Badge
														variant={badge.featured ? "default" : "secondary"}
													>
														{badge.label}
													</Badge>
												</TableCell>
												<TableCell className="whitespace-nowrap text-muted-foreground">
													{dateFormatter.format(parseCreatedAt(j.createdAt))}
												</TableCell>
												<TableCell className="text-right">
													<div className="flex justify-end gap-1">
														<Button
															size="xs"
															variant="outline"
															render={<Link to={`/post-a-job?from=${j.id}`} />}
														>
															Duplicate
														</Button>
														<AlertDialog>
															<AlertDialogTrigger
																render={
																	<Button size="xs" variant="destructive" />
																}
															>
																Delete
															</AlertDialogTrigger>
															<AlertDialogContent>
																<AlertDialogHeader>
																	<AlertDialogTitle>
																		Delete this post?
																	</AlertDialogTitle>
																	<AlertDialogDescription>
																		“{j.title}” will be permanently removed and
																		cannot be undone.
																		{j.isPaid &&
																			" Its featured credit returns to your balance."}
																	</AlertDialogDescription>
																</AlertDialogHeader>
																<AlertDialogFooter>
																	<AlertDialogCancel>Cancel</AlertDialogCancel>
																	<Form method="post">
																		<input
																			type="hidden"
																			name="intent"
																			value="delete-post"
																		/>
																		<input
																			type="hidden"
																			name="id"
																			value={j.id}
																		/>
																		<AlertDialogAction
																			type="submit"
																			variant="destructive"
																		>
																			Delete
																		</AlertDialogAction>
																	</Form>
																</AlertDialogFooter>
															</AlertDialogContent>
														</AlertDialog>
													</div>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						)}
					</TabsContent>

					<TabsContent value="billing" className="space-y-6 text-sm">
						<section className="space-y-2">
							<h2 className="font-medium">Featured post credits</h2>
							<p className="text-sm">
								Balance: <span className="font-semibold">{balance}</span>{" "}
								<span className="text-muted-foreground">
									· purchased {creditsPurchased} · used {creditsUsed}
								</span>
							</p>
							<p className="text-muted-foreground text-xs">
								Free standard post: {freePostUsed ? "used" : "available"} — one
								active standard post per account.
							</p>
							<div>
								<Button
									variant="outline"
									size="sm"
									render={<Link to="/pricing" />}
								>
									Get more credits
								</Button>
							</div>
						</section>

						<section className="space-y-3">
							<h2 className="font-medium">Order history</h2>
							{orders.length === 0 ? (
								<p className="text-muted-foreground text-sm">
									No purchases yet.
								</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Date</TableHead>
											<TableHead>Pack</TableHead>
											<TableHead className="text-right">Amount</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{orders.map((o) => (
											<TableRow key={o.id}>
												<TableCell className="whitespace-nowrap text-muted-foreground">
													{dateFormatter.format(parseCreatedAt(o.createdAt))}
												</TableCell>
												<TableCell>
													{o.packPosts} featured post
													{o.packPosts === 1 ? "" : "s"}
												</TableCell>
												<TableCell className="text-right">
													{formatRM(o.amountCents)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</section>
					</TabsContent>

					<TabsContent value="profile" className="space-y-3 text-sm">
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
					</TabsContent>
				</Tabs>
			</main>
		</div>
	);
}
