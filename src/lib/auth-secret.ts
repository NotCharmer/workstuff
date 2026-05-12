const DEV_AUTH_SECRET = "dev-only-secret-change-me";

type AuthSecretEnv = {
  NEXTAUTH_SECRET?: string;
  AUTH_SECRET?: string;
  NODE_ENV?: string;
};

export function getAuthSecret(env: AuthSecretEnv = process.env): string | undefined {
  const configuredSecret = env.NEXTAUTH_SECRET || env.AUTH_SECRET;
  if (configuredSecret) return configuredSecret;

  if (env.NODE_ENV === "production") return undefined;

  return DEV_AUTH_SECRET;
}
