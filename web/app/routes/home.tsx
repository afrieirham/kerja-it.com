import { desc } from "drizzle-orm";
import { Badge } from "~/components/core/badge";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "~/components/core/pagination";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/core/table";
import { Header } from "~/components/widget/header";
import { db } from "~/db";
import { job } from "~/db/schema";
import type { Route } from "./+types/home";

const PAGE_SIZE = 20;

const postedDateFormatter = new Intl.DateTimeFormat("en-GB", {
	dateStyle: "medium",
	timeZone: "UTC",
});

function formatPostedAt(createdAt: string) {
	return postedDateFormatter.format(
		new Date(`${createdAt.replace(" ", "T")}Z`),
	);
}

export function meta() {
	return [
		{ title: "Kerja-IT.com" },
		{ name: "description", content: "Find your next IT job." },
	];
}

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

	const [jobs, total] = await Promise.all([
		db
			.select()
			.from(job)
			.orderBy(desc(job.createdAt), desc(job.id))
			.limit(PAGE_SIZE)
			.offset((page - 1) * PAGE_SIZE),
		db.$count(job),
	]);

	return { jobs, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export default function Home({ loaderData }: Route.ComponentProps) {
	const { jobs, page, totalPages } = loaderData;

	const start = Math.max(1, Math.min(page - 2, totalPages - 4));
	const end = Math.min(totalPages, start + 4);
	const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

	return (
		<div>
			<Header />
			<main className="container mx-auto space-y-4 py-4">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Title</TableHead>
							<TableHead>Source</TableHead>
							<TableHead>Posted</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{jobs.map((j) => (
							<TableRow key={j.id}>
								<TableCell>
									<a
										href={j.url}
										target="_blank"
										rel="noreferrer"
										className="block max-w-md truncate font-medium hover:underline"
									>
										{j.title}
									</a>
								</TableCell>
								<TableCell>
									<Badge variant="secondary">{j.source}</Badge>
								</TableCell>
								<TableCell className="text-muted-foreground">
									{formatPostedAt(j.createdAt)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>

				<Pagination>
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious
								href={page > 1 ? `/?page=${page - 1}` : undefined}
								aria-disabled={page <= 1}
								className={
									page <= 1 ? "pointer-events-none opacity-50" : undefined
								}
							/>
						</PaginationItem>
						{pages.map((p) => (
							<PaginationItem key={p}>
								<PaginationLink href={`/?page=${p}`} isActive={p === page}>
									{p}
								</PaginationLink>
							</PaginationItem>
						))}
						<PaginationItem>
							<PaginationNext
								href={page < totalPages ? `/?page=${page + 1}` : undefined}
								aria-disabled={page >= totalPages}
								className={
									page >= totalPages
										? "pointer-events-none opacity-50"
										: undefined
								}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
				<p className="text-center text-muted-foreground text-xs">
					Page {page} of {totalPages}
				</p>
			</main>
		</div>
	);
}
