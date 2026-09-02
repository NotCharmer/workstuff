import { NextResponse } from "next/server";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { prisma } from "@/lib/db";
import { RequestSchema } from "@/lib/validators";
import { REQUEST_KINDS, REQUEST_STATUSES } from "@/lib/enums";
import { he } from "@/lib/i18n/he";

const requestInclude = {
  author: { select: { id: true, name: true } },
  student: {
    select: { id: true, firstName: true, lastName: true, className: true },
  },
} as const;

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
    const { searchParams } = new URL(req.url);
    const kind = searchParams.get("kind");
    const status = searchParams.get("status");

    const requests = await prisma.request.findMany({
      where: {
        branchId: branchId ?? null,
        ...(kind && REQUEST_KINDS.includes(kind as (typeof REQUEST_KINDS)[number])
          ? { kind }
          : {}),
        ...(status && REQUEST_STATUSES.includes(status as (typeof REQUEST_STATUSES)[number])
          ? { status }
          : {}),
      },
      include: requestInclude,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, requests });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: he.requests.toastError }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (user.status !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "החשבון אינו פעיל" }, { status: 403 });
    }
    const branchId = await getViewBranchId(user);
    if (!branchId) {
      return NextResponse.json({ ok: false, error: he.requests.noBranch }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
        { status: 400 }
      );
    }

    const studentId = parsed.data.studentId ?? null;
    if (studentId) {
      const student = await prisma.student.findFirst({
        where: { id: studentId, branchId },
        select: { id: true },
      });
      if (!student) {
        return NextResponse.json({ ok: false, error: he.api.studentNotFound }, { status: 404 });
      }
    }

    const request = await prisma.request.create({
      data: {
        branchId,
        authorId: user.id,
        kind: parsed.data.kind,
        title: parsed.data.title.trim(),
        details: parsed.data.details?.trim() || null,
        studentId,
        quantity:
          parsed.data.kind === "EQUIPMENT" ? parsed.data.quantity ?? 1 : null,
        status: "OPEN",
      },
      include: requestInclude,
    });

    return NextResponse.json({ ok: true, request }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: he.requests.toastError }, { status: 500 });
  }
}
