/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly VITE_STRIPE_PRICE_A_ID: string;
  readonly VITE_STRIPE_PRICE_B_ID: string;
  readonly VITE_STRIPE_PRICE_C_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
