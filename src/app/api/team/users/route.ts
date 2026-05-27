import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { resolveStaffPassword } from "@/lib/default-credentials";
import { getDefaultStaffPassword } from "@/lib/server-env";
import { TeamUserCreateSchema } from "@/lib/validators";
import { AuthError, getCurrentUser, requireRole } from "@/lib/auth";

export async function GET() {
  try {
    const actor = await getCurrentUser();
    if (actor.status !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Account not active" }, { status: 403 });
    }
    if (!actor.branchId) {
      return NextResponse.json({ ok: false, error: "No branch assigned" }, { status: 400 });
    }

    const users = await prisma.user.findMany({
      where: { branchId: actor.branchId },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        onboardingCompleted: true,
        createdAt: true,
      },
    });
    const payload: {
      ok: true;
      users: typeof users;
      defaultStaffPassword?: string;
    } = { ok: true, users };

    if (actor.role === "ADMIN" || actor.role === "BRANCH_MANAGER") {
      payload.defaultStaffPassword = getDefaultStaffPassword();
    }

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Failed to load team users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["ADMIN", "BRANCH_MANAGER"]);
    if (actor.status !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Account not active" }, { status: 403 });
    }
    if (!actor.branchId) {
      return NextResponse.json(
        { ok: false, error: "אין סניף משויך לחשבון שלך. פנו למנהל." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = TeamUserCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const password = resolveStaffPassword(parsed.data.password);
    const passwordHash = await hash(password, 12);
    const placeholderName =
      parsed.data.name?.trim() ||
      parsed.data.email.split("@")[0]?.trim() ||
      "משתמש חדש";
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        name: placeholderName,
        role: "STAFF",
        status: "PENDING",
        branchId: actor.branchId,
        passwordHash,
        onboardingCompleted: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ ok: false, error: "אימייל זה כבר קיים במערכת" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "Failed to create user" }, { status: 500 });
  }
}
