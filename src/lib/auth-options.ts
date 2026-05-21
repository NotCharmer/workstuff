import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { USER_ROLES, USER_STATUSES, type UserRole, type UserStatus } from "@/lib/enums";
import { getAuthSecret } from "@/lib/auth-secret";

const roleSet = new Set<string>(USER_ROLES);
const statusSet = new Set<string>(USER_STATUSES);
export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
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

        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email },
            include: { branch: true },
          });
        } catch (e) {
          console.error("[auth credentials] database unreachable:", e);
          return null;
        }
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
