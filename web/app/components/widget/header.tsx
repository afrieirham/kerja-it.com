import { href, Link } from "react-router";
import { Button } from "~/components/core/button";

export function Header() {
	return (
		<div className="bg-white">
			<div className="container mx-auto flex w-full items-center justify-between border-b py-2">
				<div>
					<Button variant="link" size="xs" className="font-bold px-0">
						<Link to={href("/")}>Kerja-IT.com</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
