import { ArrowRight } from "lucide-react";
import { href, Link } from "react-router";
import { Button } from "~/components/core/button";
import { TELEGRAM_CHANNEL_URL } from "~/lib/seo";

export function Header() {
	return (
		<div className="bg-white">
			<div className="container mx-auto flex w-full items-center justify-between border-b py-2">
				<div>
					<Button variant="link" size="xs" className="font-bold px-0">
						<Link to={href("/")}>Kerja-IT.com</Link>
					</Button>
				</div>
				<Button variant="link" size="xs" className="px-0">
					<a
						href={TELEGRAM_CHANNEL_URL}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1"
					>
						Get daily jobs on Telegram
						<ArrowRight />
					</a>
				</Button>
			</div>
		</div>
	);
}
