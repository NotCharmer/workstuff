const DEV_AUTH_SECRET = "dev-only-secret-change-me";

export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (secret) return secret;

  if (process.env.NODE_ENV !== "production") {
    return DEV_AUTH_SECRET;
  }

  throw new Error("NEXTAUTH_SECRET or AUTH_SECRET must be set in production.");
}
