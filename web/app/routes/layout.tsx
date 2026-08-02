import { Outlet } from "react-router";
import { Footer } from "~/components/widget/footer";

export default function Layout() {
	return (
		<>
			<Outlet />
			<Footer />
		</>
	);
}
