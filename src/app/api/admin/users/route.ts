import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { AdminUserCreateSchema } from "@/lib/validators";
import { AuthError, requireRole } from "@/lib/auth";

export async function GET() {
  try {
    const actor = await requireRole(["ADMIN", "BRANCH_MANAGER"]);
    const users = await prisma.user.findMany({
      where: actor.role === "ADMIN" ? {} : { branchId: actor.branchId },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        branch: { select: { id: true, code: true, name: true } },
        createdAt: true,
      },
    });
    return NextResponse.json({ ok: true, users });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Failed to load users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["ADMIN", "BRANCH_MANAGER"]);
    const body = await req.json().catch(() => null);
    const parsed = AdminUserCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const targetBranchId = actor.role === "ADMIN" ? parsed.data.branchId : actor.branchId;
    if (!targetBranchId) {
      return NextResponse.json({ ok: false, error: "Branch required" }, { status: 400 });
    }
    const branch = await prisma.branch.findUnique({ where: { id: targetBranchId } });
    if (!branch) {
      return NextResponse.json({ ok: false, error: "Branch not found" }, { status: 404 });
    }

    const passwordHash = await hash(parsed.data.password, 12);
    const role = actor.role === "ADMIN" ? parsed.data.role : "STAFF";
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        name: parsed.data.name,
        role,
        branchId: targetBranchId,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
      },
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Failed to create user" }, { status: 500 });
  }
}
