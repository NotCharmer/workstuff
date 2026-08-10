import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { AdminUserPatchSchema } from "@/lib/validators";
import { AuthError, requireRole } from "@/lib/auth";
import {
  getAuthorizedActivationBranchIds,
  resolveRequestedBranchIds,
  syncUserBranchAccess,
} from "@/lib/user-branches";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole(["ADMIN", "BRANCH_MANAGER"]);
    const body = await req.json().catch(() => null);
    const parsed = AdminUserPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    if (parsed.data.branchId) {
      const branch = await prisma.branch.findUnique({ where: { id: parsed.data.branchId } });
      if (!branch) {
        return NextResponse.json({ ok: false, error: "Branch not found" }, { status: 404 });
      }
    }

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, branchId: true, requestedBranchCode: true },
    });
    if (!target) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }
    if (actor.role !== "ADMIN") {
      if (!actor.branchId || target.branchId !== actor.branchId) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      if (target.role === "ADMIN" || parsed.data.role === "ADMIN") {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      if (parsed.data.status === "BLOCKED") {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      if (parsed.data.branchId && parsed.data.branchId !== actor.branchId) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
    }

    const data: { role?: string; status?: string; branchId?: string; passwordHash?: string } = {};
    if (parsed.data.role) data.role = parsed.data.role;
    if (parsed.data.status) data.status = parsed.data.status;
    if (parsed.data.branchId) data.branchId = parsed.data.branchId;
    if (parsed.data.password) data.passwordHash = await hash(parsed.data.password, 12);

    if (parsed.data.status === "ACTIVE") {
      const finalBranchId = parsed.data.branchId ?? target.branchId;
      const requestedBranchIds =
        actor.role === "ADMIN" ? await resolveRequestedBranchIds(target.requestedBranchCode) : [];
      const activationBranchIds = getAuthorizedActivationBranchIds(
        actor,
        finalBranchId,
        requestedBranchIds
      );
      await syncUserBranchAccess(target.id, activationBranchIds);
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        branchId: true,
      },
    });
    return NextResponse.json({ ok: true, user: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message === "REQUESTED_BRANCH_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Requested branch not found" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Failed to update user" }, { status: 500 });
  }
}
