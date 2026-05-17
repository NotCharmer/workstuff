import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TeamUserPatchSchema } from "@/lib/validators";
import { AuthError, requireRole } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole(["ADMIN", "BRANCH_MANAGER"]);
    if (!actor.branchId) {
      return NextResponse.json({ ok: false, error: "No branch assigned" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const parsed = TeamUserPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    if (!parsed.data.role && !parsed.data.status) {
      return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, status: true, branchId: true },
    });
    if (!target) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }
    if (target.branchId !== actor.branchId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    if (target.id === actor.id) {
      return NextResponse.json({ ok: false, error: "Cannot change your own permissions here" }, { status: 400 });
    }

    if (actor.role === "BRANCH_MANAGER") {
      if (target.role === "ADMIN" || parsed.data.role === "ADMIN") {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      if (parsed.data.role === "BRANCH_MANAGER") {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      if (parsed.data.status === "BLOCKED") {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
    }

    const data: { role?: string; status?: string } = {};
    if (parsed.data.role) data.role = parsed.data.role;
    if (parsed.data.status) data.status = parsed.data.status;

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Failed to update user" }, { status: 500 });
  }
}
