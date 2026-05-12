import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { USER_ROLES, type UserRole } from "@/lib/enums";
import { getAuthSecret } from "@/lib/auth-secret";

const roleSet = new Set<string>(USER_ROLES);

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

        const user = await prisma.user.findUnique({
          where: { email },
          include: { branch: true },
        });
        if (!user?.passwordHash) return null;
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        const role: UserRole = roleSet.has(user.role) ? (user.role as UserRole) : "STAFF";
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role,
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
        (token as any).branchId = (user as any).branchId ?? null;
        (token as any).branchCode = (user as any).branchCode ?? null;
        (token as any).branchName = (user as any).branchName ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub ?? "";
        (session.user as any).role = ((token as any).role as UserRole | undefined) ?? "STAFF";
        (session.user as any).branchId = ((token as any).branchId as string | null | undefined) ?? null;
        (session.user as any).branchCode = ((token as any).branchCode as string | null | undefined) ?? null;
        (session.user as any).branchName = ((token as any).branchName as string | null | undefined) ?? null;
      }
      return session;
    },
  },
};
