import {
  SignedIn,
  SignedOut,
  SignOutButton,
  useUser,
} from "@clerk/react-router";
import { Link } from "react-router";

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
        {/* <SignUpButton>
          <button className="cursor-pointer text-sm hover:underline disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:no-underline">
            login
          </button>
        </SignUpButton> */}
      </SignedOut>
      <SignedIn>
        <div className="flex items-center gap-2 text-sm">
          <Link
            to="/profile"
            className="cursor-pointer text-sm lowercase hover:underline disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:no-underline"
          >
            {user?.fullName}
          </Link>
          {user && <p>/</p>}
          <Link
            to="/dashboard"
            className="cursor-pointer text-sm lowercase hover:underline disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:no-underline"
          >
            dashboard
          </Link>
          <p>/</p>
          <SignOutButton>
            <button className="cursor-pointer text-sm hover:underline disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:no-underline">
              logout
            </button>
          </SignOutButton>
        </div>
      </SignedIn>
    </div>
  );
}
