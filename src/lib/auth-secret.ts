export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXTAUTH_SECRET or AUTH_SECRET must be set in production");
  }

  return "dev-only-secret-change-me";
}
