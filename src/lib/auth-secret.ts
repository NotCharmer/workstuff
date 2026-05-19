const DEV_AUTH_SECRET = "dev-only-secret-change-me";

function configuredAuthSecret() {
  return process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim() || "";
}

export function getAuthSecret() {
  const secret = configuredAuthSecret();
  if (secret) return secret;

  if (process.env.NODE_ENV !== "production") {
    return DEV_AUTH_SECRET;
  }

  return undefined;
}
