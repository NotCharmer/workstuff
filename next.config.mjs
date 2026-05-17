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

// NextAuth inlines NEXTAUTH_URL in the client bundle. On Vercel previews, if this
// is missing, auth calls can misbehave. Prefer explicit NEXTAUTH_URL in Vercel,
// else fall back to the current deployment host at build time.
const vercelOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
const nextAuthUrlForBuild =
  process.env.NEXTAUTH_URL?.trim() || vercelOrigin || "http://localhost:3000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXTAUTH_URL: nextAuthUrlForBuild,
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
