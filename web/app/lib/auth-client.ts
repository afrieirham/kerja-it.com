import { createAuthClient } from "better-auth/react";

// Named auth-client.ts (dash), NOT auth.client.ts: the react-router:dot-client
// Vite plugin rewrites every export of *.client.ts modules to undefined in the
// SSR bundle, and this client is imported by components (header, sign-in)
// that render on the server. See AGENTS.md.
export const authClient = createAuthClient();
