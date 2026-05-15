import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
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

type GoogleUserLike = {
  email?: string | null;
  name?: string | null;
};

function emailDomain(email: string): string {
  const idx = email.lastIndexOf("@");
  return idx >= 0 ? email.slice(idx + 1).toLowerCase() : "";
}

function isGoogleEmailAllowed(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  if (ALLOWED_GOOGLE_EMAILS.size > 0) {
    return ALLOWED_GOOGLE_EMAILS.has(normalized);
  }

  const domain = emailDomain(normalized);
  return Boolean(DISTRICT_GOOGLE_DOMAIN) && domain === DISTRICT_GOOGLE_DOMAIN;
}

async function ensureGoogleUser(user: GoogleUserLike, profile?: unknown) {
  const email = user.email?.trim().toLowerCase();
  if (!email) return null;

  const profileName =
    profile && typeof profile === "object" && "name" in profile
      ? String((profile as { name?: unknown }).name || "")
      : "";
  const providerName = user.name || profileName;
  const name = providerName || email;

  return prisma.user.upsert({
    where: { email },
    update: providerName ? { name: providerName } : { email },
    create: {
      email,
      name,
      role: "STAFF",
      status: "PENDING",
      onboardingCompleted: false,
    },
    include: { branch: true },
  });
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
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString() ?? "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { branch: true },
        });
        if (!user?.passwordHash) return null;
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        const role: UserRole = roleSet.has(user.role) ? (user.role as UserRole) : "STAFF";
        const status: UserStatus = statusSet.has(user.status) ? (user.status as UserStatus) : "PENDING";
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role,
          status,
          onboardingCompleted: user.onboardingCompleted,
          branchId: user.branchId,
          branchCode: user.branch?.code ?? null,
          branchName: user.branch?.name ?? null,
        } as any;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase() || "";
        if (!isGoogleEmailAllowed(email)) {
          return "/login?error=google_not_allowed";
        }
        await ensureGoogleUser(user, profile);
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
        const dbUser = await prisma.user.findUnique({
          where: { email: String((token as any).email).toLowerCase() },
          include: { branch: true },
        });
        if (dbUser) {
          token.sub = dbUser.id;
          (token as any).role = roleSet.has(dbUser.role) ? dbUser.role : "STAFF";
          (token as any).status = statusSet.has(dbUser.status) ? dbUser.status : "PENDING";
          (token as any).onboardingCompleted = Boolean(dbUser.onboardingCompleted);
          (token as any).branchId = dbUser.branchId;
          (token as any).branchCode = dbUser.branch?.code ?? null;
          (token as any).branchName = dbUser.branch?.name ?? null;
        } else {
          token.sub = "";
          (token as any).role = "STAFF";
          (token as any).status = "PENDING";
          (token as any).onboardingCompleted = false;
          (token as any).branchId = null;
          (token as any).branchCode = null;
          (token as any).branchName = null;
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
