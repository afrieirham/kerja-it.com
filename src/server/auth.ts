import { env } from "@/env";
import { createClerkClient } from "@clerk/react-router/api.server";

export const clerkClient = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
});
