import { useState } from "react";
import { Form, Link, useRouteLoaderData } from "react-router";
import { Badge } from "~/components/core/badge";
import { Button } from "~/components/core/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
	FieldTitle,
} from "~/components/core/field";
import { RadioGroup, RadioGroupItem } from "~/components/core/radio-group";
import { Footer } from "~/components/widget/footer";
import { Header } from "~/components/widget/header";
import { formatRM, PACKS } from "~/lib/job-packs";
import { buildMeta, SITE_NAME } from "~/lib/seo";
import { isStripeConfigured } from "~/lib/stripe.server";
import type { loader as rootLoader } from "~/root";
import type { Route } from "./+types/pricing";

export function meta() {
	return buildMeta({
		title: `Pricing | ${SITE_NAME}`,
		description: `Post tech jobs in Malaysia on ${SITE_NAME}. First post free; featured posts from RM50 — pinned, pushed to Telegram, salary shown. Reviewed before going live.`,
		path: "/pricing",
	});
}

const FREE_PERKS = [
	"Listed with your own job page",
	"Salary shown, every post here has one",
	"Included once in the daily Telegram digest",
	"Live for up to 3 months",
	"1 active post per account",
];

const FEATURED_PERKS = [
	"Pinned to the top for 30 days",
	"Instant dedicated post on @KerjaIT_daily",
	"Top slot in the daily digest during the featured period",
	"Priority review",
	"Credits never expire, use them anytime",
];

const FAQ = [
	{
		q: "Do you review posts?",
		a: "Yes — every post, free or paid, is reviewed before going live.",
	},
	{
		q: "What if my paid post is rejected?",
		a: "The credit returns to your account automatically. We never hold payment for a post that doesn't go live.",
	},
	{
		q: "How long does a post stay up?",
		a: "Up to 3 months, like every job on the board. The featured perks (pin, Telegram push) run for the first 30 days after approval.",
	},
	{
		q: "Where do posts appear?",
		a: "On kerja-it.com with a dedicated, Google-indexable page, and on our Telegram channel @KerjaIT_daily.",
	},
];

export function loader() {
	return { paymentsEnabled: isStripeConfigured() };
}

export default function Pricing({ loaderData }: Route.ComponentProps) {
	const { paymentsEnabled } = loaderData;
	const data = useRouteLoaderData<typeof rootLoader>("root");

	const user = data?.user;

	const [selectedPackId, setSelectedPackId] = useState(PACKS[0].id);

	const selectedPack =
		PACKS.find((pack) => pack.id === selectedPackId) ?? PACKS[0];

	return (
		<div className="px-4">
			<Header />
			<main className="container mx-auto max-w-4xl space-y-10 py-8">
				<div className="space-y-2 text-center">
					<h1 className="text-2xl font-semibold">
						Reach Malaysia's tech talent
					</h1>
					<p className="text-muted-foreground text-sm">
						First post free. Featured posts are pinned and pushed to Telegram.
					</p>
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					<section className="flex flex-col space-y-4 border p-4">
						<div className="space-y-1">
							<h2 className="font-medium">Free</h2>
							<p className="text-2xl font-semibold">RM0</p>
							<p className="text-muted-foreground text-xs">1 standard post</p>
						</div>
						<ul className="flex-1 space-y-1 text-muted-foreground text-xs list-disc list-inside">
							{FREE_PERKS.map((perk) => (
								<li key={perk}>{perk}</li>
							))}
						</ul>
						<Button variant="outline">
							<Link to="/post-a-job">Post free</Link>
						</Button>
					</section>

					<section className="flex flex-col space-y-4 border p-4">
						<div className="space-y-1">
							<h2 className="font-medium">Featured</h2>
							<p className="text-2xl font-semibold">
								{formatRM(selectedPack.priceCents)}
							</p>
							<p className="text-muted-foreground text-xs">
								Everything in Free, plus:
							</p>
						</div>
						<ul className="flex-1 space-y-1 text-muted-foreground text-xs list-disc list-inside">
							{FEATURED_PERKS.map((perk) => (
								<li key={perk}>{perk}</li>
							))}
						</ul>

						<RadioGroup
							value={selectedPackId}
							onValueChange={(v) => setSelectedPackId(v)}
						>
							{PACKS.map((pack) => (
								<FieldLabel key={pack.id} htmlFor={pack.id}>
									<Field
										orientation="horizontal"
										className="flex items-center! gap-4 justify-between"
									>
										<RadioGroupItem value={pack.id} id={pack.id} />
										<FieldContent>
											<FieldTitle>
												{pack.posts} {pack.posts === 1 ? "post" : "posts"}
											</FieldTitle>
											<FieldDescription>
												{formatRM(pack.priceCents / pack.posts)} per post
											</FieldDescription>
										</FieldContent>
										<p className="flex items-center gap-2">
											{pack.id !== "1" && (
												<Badge
													variant="outline"
													className="text-xs font-normal"
												>
													Save{" "}
													{formatRM(
														pack.discount * (PACKS[0].priceCents * pack.posts),
													)}
												</Badge>
											)}
										</p>
									</Field>
								</FieldLabel>
							))}
						</RadioGroup>

						<Form method="post" action="/api/checkout">
							<input type="hidden" name="pack" value={selectedPackId} />
							<input type="hidden" name="email" value={user?.email} />
							<Button
								type="submit"
								className="w-full"
								disabled={!paymentsEnabled}
							>
								{paymentsEnabled
									? `Continue with ${selectedPack.posts} ${selectedPack.posts === 1 ? "post" : "posts"}`
									: "Coming soon"}
							</Button>
						</Form>
					</section>
				</div>

				<section className="mx-auto max-w-2xl space-y-4">
					<h2 className="text-center font-medium">FAQ</h2>
					{FAQ.map((item) => (
						<div key={item.q} className="space-y-1">
							<h3 className="text-sm font-medium">{item.q}</h3>
							<p className="text-muted-foreground text-xs">{item.a}</p>
						</div>
					))}
				</section>
			</main>
			<Footer />
		</div>
	);
}
