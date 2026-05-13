const DEV_AUTH_SECRET = "dev-only-secret-change-me";

export function getAuthSecret(): string | undefined {
  const configured = (process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "").trim();
  if (configured) return configured;

  // Never sign production sessions with a public, hard-coded secret. Returning
  // undefined lets NextAuth fail closed when production auth is misconfigured.
  if (process.env.NODE_ENV === "production") return undefined;

  return DEV_AUTH_SECRET;
}
