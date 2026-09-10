/** Passwordless login is allowed only in `next dev`, never in production. */
export function isPasswordlessLocalAuth() {
  return process.env.NODE_ENV === "development";
}
