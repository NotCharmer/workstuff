import { NextResponse } from "next/server";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { prisma } from "@/lib/db";
import { PatchRequestSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";

const requestInclude = {
  author: { select: { id: true, name: true } },
  student: {
    select: { id: true, firstName: true, lastName: true, className: true },
  },
} as const;

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
    const body = await req.json().catch(() => null);
    const parsed = PatchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
        { status: 400 }
      );
    }

    const existing = await prisma.request.findFirst({
      where: { id: params.id, branchId: branchId ?? null },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: he.requests.notFound }, { status: 404 });
    }

    const request = await prisma.request.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status,
        title: parsed.data.title?.trim(),
        details:
          parsed.data.details === undefined
            ? undefined
            : parsed.data.details?.trim() || null,
        quantity: parsed.data.quantity === undefined ? undefined : parsed.data.quantity,
      },
      include: requestInclude,
    });

    return NextResponse.json({ ok: true, request });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: he.requests.toastError }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
    const existing = await prisma.request.findFirst({
      where: { id: params.id, branchId: branchId ?? null },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: he.requests.notFound }, { status: 404 });
    }
    await prisma.request.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: he.requests.toastError }, { status: 500 });
  }
}
