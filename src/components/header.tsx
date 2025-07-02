import {
  SignedIn,
  SignedOut,
  SignOutButton,
  SignUpButton,
  useClerk,
  useUser,
} from "@clerk/react-router";
import { href, Link, NavLink } from "react-router";

import { Button } from "@/components/ui/button";

export function Header() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();

  return (
    <div className="bg-white">
      <div className="container flex w-full items-center justify-between border-b py-2">
        <div>
          <Button
            variant="minimal"
            size="minimal"
            className="font-bold"
            asChild
          >
            <Link to={href("/")}>Kerja-IT.com</Link>
          </Button>
        </div>
        {/* <SignedOut>
          <SignUpButton>
            <Button variant="minimal" size="minimal">
              login
            </Button>
          </SignUpButton>
        </SignedOut> */}
        <SignedIn>
          <div className="flex items-center gap-2 text-sm">
            <Button
              variant="minimal"
              size="minimal"
              className="lowercase"
              onClick={() => openUserProfile()}
            >
              {user?.fullName}
            </Button>
            {user && <p>/</p>}
            <Button variant="minimal" size="minimal" asChild>
              <NavLink to={href("/dashboard")}>dashboard</NavLink>
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
    </div>
  );
}
