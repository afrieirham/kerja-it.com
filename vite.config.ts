import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default ({ mode }: { mode: string }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  return defineConfig({
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
    server: {
      allowedHosts:
        process.env.NODE_ENV === "production" ? [] : ["kerja-it.loca.lt"],
    },
    envDir: ".env",
  });
};
