import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AdminBranchCreateSchema } from "@/lib/validators";
import { AuthError, requireRole } from "@/lib/auth";

export async function GET() {
  try {
    const actor = await requireRole(["ADMIN", "BRANCH_MANAGER"]);
    const branches = await prisma.branch.findMany({
      where: actor.role === "ADMIN" ? {} : { id: actor.branchId ?? "__none__" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        _count: { select: { users: true, students: true } },
      },
    });
    return NextResponse.json({ ok: true, branches });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Failed to load branches" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(["ADMIN"]);
    const body = await req.json().catch(() => null);
    const parsed = AdminBranchCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const branch = await prisma.branch.create({
      data: {
        code: parsed.data.code.toLowerCase(),
        name: parsed.data.name,
      },
      select: { id: true, code: true, name: true },
    });
    return NextResponse.json({ ok: true, branch }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Failed to create branch" }, { status: 500 });
  }
}
