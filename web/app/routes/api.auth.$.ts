import { auth } from "~/lib/auth.server";
import type { Route } from "./+types/api.auth.$";

export function loader({ request }: Route.LoaderArgs) {
	return auth.handler(request);
}

export function action({ request }: Route.ActionArgs) {
	return auth.handler(request);
}
