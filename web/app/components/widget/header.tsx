import { href, Link, useNavigate, useRouteLoaderData } from "react-router";
import { Button } from "~/components/core/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/core/dropdown-menu";
import { Slash } from "~/components/core/slash";
import { authClient } from "~/lib/auth-client";
import { TELEGRAM_CHANNEL_URL } from "~/lib/seo";
import type { loader as rootLoader } from "~/root";

export function Header() {
	const data = useRouteLoaderData<typeof rootLoader>("root");
	const user = data?.user ?? null;
	const navigate = useNavigate();

	const signOut = () =>
		authClient.signOut({ fetchOptions: { onSuccess: () => navigate("/") } });

	return (
		<nav className="bg-white">
			<div className="container mx-auto flex w-full items-center justify-between border-b py-2">
				<div className="flex items-center">
					<Button
						variant="link"
						size="xs"
						className="font-bold pl-0"
						render={<Link to={href("/")} />}
					>
						Kerja-IT.com
					</Button>
				</div>
				<div className="flex items-center gap-1">
					{user ? (
						<DropdownMenu>
							<DropdownMenuTrigger render={<Button variant="link" size="xs" />}>
								{user.name}
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-fit">
								<DropdownMenuGroup>
									<DropdownMenuLabel>
										<p>My Account</p>
										<p>{user.email}</p>
									</DropdownMenuLabel>
									<DropdownMenuItem render={<Link to={href("/dashboard")} />}>
										Dashboard
									</DropdownMenuItem>
									<DropdownMenuItem
										render={<Link to="/dashboard?tab=billing" />}
									>
										Billing
									</DropdownMenuItem>
									<DropdownMenuItem
										render={<Link to="/dashboard?tab=profile" />}
									>
										Profile
									</DropdownMenuItem>
									<DropdownMenuItem render={<Link to={href("/pricing")} />}>
										Pricing
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem onClick={signOut}>Log out</DropdownMenuItem>
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						<>
							<Button
								variant="link"
								size="xs"
								render={
									<a
										href={TELEGRAM_CHANNEL_URL}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1"
									>
										daily job alerts
									</a>
								}
							/>
							<Slash />
							<Button
								size="xs"
								variant="link"
								render={<Link to={href("/post-a-job")} />}
							>
								post a job
							</Button>
							<Slash />
							<Button
								size="xs"
								variant="link"
								render={<Link to={href("/pricing")} />}
							>
								pricing
							</Button>
							<Slash />
							<Button
								size="xs"
								variant="link"
								render={<Link to={href("/sign-in")} />}
							>
								login
							</Button>
						</>
					)}
				</div>
			</div>
		</nav>
	);
}
