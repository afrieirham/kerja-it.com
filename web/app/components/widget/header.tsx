import { Megaphone } from "lucide-react";
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
				<div>
					<Button variant="link" size="xs" className="font-bold px-0">
						<Link to={href("/")}>Kerja-IT.com</Link>
					</Button>
				</div>
				<div>
					<Button variant="link" size="xs">
						<a
							href={TELEGRAM_CHANNEL_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1"
						>
							<Megaphone className="size-3" />
							Get daily jobs on Telegram
						</a>
					</Button>
				</div>
				<div className="flex items-center gap-1">
					<Button size="xs" variant="link">
						<Link to={href("/post-a-job")}>Post a job</Link>
					</Button>
					<p className="text-xs text-muted-foreground">/</p>
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
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem onClick={signOut}>Log out</DropdownMenuItem>
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						<Button size="xs" variant="link">
							<Link to={href("/sign-in")}>Login</Link>
						</Button>
					)}
				</div>
			</div>
		</nav>
	);
}
