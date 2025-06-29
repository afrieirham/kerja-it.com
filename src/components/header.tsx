import {
  SignedIn,
  SignedOut,
  SignOutButton,
  SignUpButton,
  useUser,
} from "@clerk/react-router";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";

export function Header() {
  const { user } = useUser();

  return (
    <div className="flex w-full items-center justify-between">
      <div>
        <h1 className="text-sm font-bold hover:underline">
          <Link to="/">Kerja-IT.com</Link>
        </h1>
      </div>
      <SignedOut>
        <SignUpButton>
          <Button variant="minimal" size="minimal">
            login
          </Button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="minimal"
            size="minimal"
            className="lowercase"
            asChild
          >
            <Link to="/profile">{user?.fullName}</Link>
          </Button>
          {user && <p>/</p>}
          <Button variant="minimal" size="minimal" asChild>
            <Link to="/dashboard">dashboard</Link>
          </Button>
          <p>/</p>
          <SignOutButton>
            <Button variant="minimal" size="minimal">
              logout
            </Button>
          </SignOutButton>
        </div>
      </SignedIn>
    </div>
  );
}
