import type { Config } from "tailwindcss";
import sharedConfig from "../../packages/ui/src/tailwind.config";

const config: Config = {
  ...sharedConfig,
  content: [
    "./src/**/*.{ts,tsx}",
    "./middleware.ts",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
