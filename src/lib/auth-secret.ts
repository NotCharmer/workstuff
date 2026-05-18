const DEV_AUTH_SECRET = "dev-only-secret-change-me";

type AuthSecretEnv = {
  NEXTAUTH_SECRET?: string;
  AUTH_SECRET?: string;
  NODE_ENV?: string;
};

export function getAuthSecret(env: AuthSecretEnv = process.env): string | undefined {
  const nextAuthSecret = env.NEXTAUTH_SECRET?.trim();
  if (nextAuthSecret) return nextAuthSecret;

  const authSecret = env.AUTH_SECRET?.trim();
  if (authSecret) return authSecret;

  // Never sign production JWTs with a public fallback. With no secret configured,
  // auth fails closed instead of issuing forgeable sessions.
  if (env.NODE_ENV === "production") return undefined;

  return DEV_AUTH_SECRET;
}
