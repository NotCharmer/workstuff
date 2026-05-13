import type { DefaultSession } from "next-auth";
import type { UserRole, UserStatus } from "@/lib/enums";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      status: UserStatus;
      onboardingCompleted: boolean;
      branchId: string | null;
      branchCode: string | null;
      branchName: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    status?: UserStatus;
    onboardingCompleted?: boolean;
    branchId?: string | null;
    branchCode?: string | null;
    branchName?: string | null;
  }
}
