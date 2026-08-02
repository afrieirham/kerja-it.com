import { useState } from "react";
import { Button } from "~/components/core/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/core/tooltip";

function Footer() {
	const [copyingEmail, setCopyingEmail] = useState(false);

	return (
		<nav className="container mx-auto flex w-full items-center justify-between border-t py-4">
			<p className="text-xs text-muted-foreground">
				&copy; {new Date().getFullYear()} Kerja-IT.com, All rights reserved.
			</p>
			<div className="flex items-center">
				<Button size="xs" variant="link">
					<a
						target="_blank"
						rel="noopener"
						href="https://github.com/afrieirham/kerja-it.com"
					>
						GitHub
					</a>
				</Button>
				<p className="text-xs">/</p>
				<Button size="xs" variant="link">
					<a target="_blank" rel="noopener" href="https://t.me/kerjait_daily">
						Telegram
					</a>
				</Button>
				<p className="text-xs">/</p>
				<Tooltip>
					<TooltipTrigger
						closeOnClick={false}
						render={
							<Button
								size="xs"
								variant="link"
								onClick={() => {
									setCopyingEmail(true);
									navigator.clipboard.writeText("contact@kerja-it.com");
									setTimeout(() => setCopyingEmail(false), 1000);
								}}
							/>
						}
					>
						contact@kerja-it.com
					</TooltipTrigger>
					<TooltipContent>
						<p>{copyingEmail ? "Copied" : "Click to copy"}</p>
					</TooltipContent>
				</Tooltip>
			</div>
		</nav>
	);
}

export { Footer };
