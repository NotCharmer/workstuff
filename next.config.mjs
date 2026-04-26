import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.join(__dirname, ".env");
const rootLocal = path.join(__dirname, ".env.local");
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv, override: true });
}
if (fs.existsSync(rootLocal)) {
  dotenv.config({ path: rootLocal, override: true });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
