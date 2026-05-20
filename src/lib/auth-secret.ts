const DEV_AUTH_SECRET = "dev-only-secret-change-me";
const PRODUCTION_BUILD_PHASE = "phase-production-build";

export function getAuthSecret() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (secret) return secret;

  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== PRODUCTION_BUILD_PHASE
  ) {
    throw new Error("NEXTAUTH_SECRET or AUTH_SECRET must be set in production");
  }

  return DEV_AUTH_SECRET;
}
