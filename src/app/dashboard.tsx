import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

import { Header } from "@/components/header";
import type { Route } from "./+types/dashboard";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect("/");
  }
}

function Dashboard() {
  return (
    <div className="mx-auto max-w-6xl p-4">
      <Header />
      <p>Dashboard</p>
    </div>
  );
}

export default Dashboard;
