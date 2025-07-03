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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
        <SignedOut>
          <div className="flex items-center gap-2 text-sm">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="minimal" size="minimal">
                  post a job
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-lg font-medium sm:text-xl">
                    Sign in to helps us filter spams!
                  </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-2 text-sm text-black">
                  <p>
                    Signing in helps us keep spam at bay. After logged in, you
                    can easily post job listings for free.
                  </p>
                  <p>
                    Thank you for helping us maintain a trustworthy job board!
                  </p>
                </div>
                <SignUpButton>
                  <Button className="mt-4">
                    <GoogleSVG />
                    <span>Sign in with Google</span>
                  </Button>
                </SignUpButton>
              </DialogContent>
            </Dialog>
            <p>/</p>
            <SignUpButton>
              <Button variant="minimal" size="minimal">
                login
              </Button>
            </SignUpButton>
          </div>
        </SignedOut>
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

function GoogleSVG() {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <title>Google</title>
      <path
        fill="currentColor"
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
      />
    </svg>
  );
}
