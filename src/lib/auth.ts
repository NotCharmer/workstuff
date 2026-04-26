import { cache } from "react";
import { prisma } from "./db";
import type { UserRole } from "./enums";

/**
 * Single-tenant helper for locally-installed schools.
 *
 * No login screen, no cookies, no sessions — every request is attributed to
 * the same "School Staff" user. The User model is kept so notes and upload
 * sessions still have a real foreign key, and so we can add real auth later
 * without a migration.
 *
 * If you later want per-teacher attribution, swap the body of getCurrentUser
 * for NextAuth / SSO — the rest of the app only consumes CurrentUser.
 */

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

const DEFAULT_EMAIL = "staff@school.local";
const DEFAULT_NAME = "צוות בית ספר";

export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const user = await prisma.user.upsert({
    where: { email: DEFAULT_EMAIL },
    update: {},
    create: { email: DEFAULT_EMAIL, name: DEFAULT_NAME, role: "ADMIN" },
  });
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: (user.role as UserRole) ?? "STAFF",
  };
});
