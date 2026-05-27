import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ACTIVE_BRANCH_COOKIE } from "@/lib/branch-scope";
import { SCHOOL_CODES } from "@/lib/schools";
import { getUserAccessibleBranchIds } from "@/lib/user-branches";

const BodySchema = z.object({
  branchId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (user.status !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Account not active" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid branch" }, { status: 400 });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: parsed.data.branchId },
      select: { id: true, code: true, name: true },
    });
    if (!branch || !(SCHOOL_CODES as readonly string[]).includes(branch.code)) {
      return NextResponse.json({ ok: false, error: "בית ספר לא נמצא" }, { status: 404 });
    }

    if (user.role !== "ADMIN") {
      const accessible = await getUserAccessibleBranchIds(user.id);
      const allowedIds = accessible.length > 0 ? accessible : user.branchId ? [user.branchId] : [];
      if (!allowedIds.includes(branch.id)) {
        return NextResponse.json({ ok: false, error: "אין הרשאה לסניף זה" }, { status: 403 });
      }
    }

    const res = NextResponse.json({ ok: true, branch });
    res.cookies.set(ACTIVE_BRANCH_COOKIE, branch.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Failed to switch school" }, { status: 500 });
  }
}
