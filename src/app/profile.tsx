import { UserProfile } from "@clerk/react-router";

import { Header } from "@/components/header";
import type { Route } from "./+types/profile";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Kerja-IT.com | Profile" },
    {
      name: "description",
      content: "IT jobs in Malaysia sourced from various job boards.",
    },
  ];
}

function Profile() {
  return (
    <div>
      <Header />
      <div className="mx-auto my-8 flex items-center justify-center">
        <UserProfile path="/profile" routing="path" />
      </div>
    </div>
  );
}

export default Profile;
