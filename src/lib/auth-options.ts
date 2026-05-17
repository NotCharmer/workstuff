import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db";
import { USER_ROLES, USER_STATUSES, type UserRole, type UserStatus } from "@/lib/enums";

const roleSet = new Set<string>(USER_ROLES);
const statusSet = new Set<string>(USER_STATUSES);
const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "dev-only-secret-change-me";
const DISTRICT_GOOGLE_DOMAIN = process.env.DISTRICT_GOOGLE_DOMAIN?.trim().toLowerCase() || "";
const ALLOWED_GOOGLE_EMAILS = new Set(
  (process.env.ALLOWED_GOOGLE_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
);

function emailDomain(email: string): string {
  const idx = email.lastIndexOf("@");
  return idx >= 0 ? email.slice(idx + 1).toLowerCase() : "";
}

function isGoogleEmailAllowed(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  if (ALLOWED_GOOGLE_EMAILS.size > 0) return ALLOWED_GOOGLE_EMAILS.has(normalized);
  const domain = emailDomain(normalized);
  return Boolean(DISTRICT_GOOGLE_DOMAIN) && domain === DISTRICT_GOOGLE_DOMAIN;
}

export const authOptions: NextAuthOptions = {
  secret: AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" || !user.email) return;
      const email = user.email.toLowerCase();
      if (!isGoogleEmailAllowed(email)) return;
      try {
        await prisma.user.upsert({
          where: { email },
          create: {
            email,
            name: user.name || (profile as any)?.name || email,
            role: "STAFF",
            status: "PENDING",
            onboardingCompleted: false,
          },
          update: {
            name: user.name || undefined,
          },
        });
      } catch (e) {
        console.error("[auth events.signIn] Google user sync failed:", e);
      }
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase() || "";
        if (!isGoogleEmailAllowed(email)) {
          return "/login?error=google_not_allowed";
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        (token as any).role = (user as any).role ?? "STAFF";
        (token as any).status = (user as any).status ?? "PENDING";
        (token as any).onboardingCompleted = (user as any).onboardingCompleted ?? false;
        (token as any).branchId = (user as any).branchId ?? null;
        (token as any).branchCode = (user as any).branchCode ?? null;
        (token as any).branchName = (user as any).branchName ?? null;
      }

      if ((token as any).email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: String((token as any).email).toLowerCase() },
            include: { branch: true },
          });
          if (dbUser) {
            (token as any).role = roleSet.has(dbUser.role) ? dbUser.role : "STAFF";
            (token as any).status = statusSet.has(dbUser.status) ? dbUser.status : "PENDING";
            (token as any).onboardingCompleted = Boolean(dbUser.onboardingCompleted);
            (token as any).branchId = dbUser.branchId;
            (token as any).branchCode = dbUser.branch?.code ?? null;
            (token as any).branchName = dbUser.branch?.name ?? null;
          }
        } catch (e) {
          console.error("[auth jwt] prisma.user lookup failed:", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub ?? "";
        (session.user as any).role = ((token as any).role as UserRole | undefined) ?? "STAFF";
        (session.user as any).status =
          ((token as any).status as UserStatus | undefined) ?? "PENDING";
        (session.user as any).onboardingCompleted =
          ((token as any).onboardingCompleted as boolean | undefined) ?? false;
        (session.user as any).branchId = ((token as any).branchId as string | null | undefined) ?? null;
        (session.user as any).branchCode = ((token as any).branchCode as string | null | undefined) ?? null;
        (session.user as any).branchName = ((token as any).branchName as string | null | undefined) ?? null;
      }
      return session;
    },
  },
};
