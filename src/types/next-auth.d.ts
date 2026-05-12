import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/enums";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      branchId: string | null;
      branchCode: string | null;
      branchName: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    branchId?: string | null;
    branchCode?: string | null;
    branchName?: string | null;
  }
}
