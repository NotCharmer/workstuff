import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { ClassVisitSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";

export async function GET(req: Request) {
  const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? undefined;
  const className = searchParams.get("className") ?? undefined;
  const visits = await prisma.classVisit.findMany({
    where: {
      branchId: branchId,
      ...(date ? { date } : {}),
      ...(className ? { className } : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ ok: true, visits });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
  const body = await req.json().catch(() => null);
  const parsed = ClassVisitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
      { status: 400 }
    );
  }
  const visit = await prisma.classVisit.create({
    data: {
      branchId: branchId,
      date: parsed.data.date,
      className: parsed.data.className.trim(),
      subject: parsed.data.subject.trim(),
      durationMinutes: parsed.data.durationMinutes ?? 60,
      notes: parsed.data.notes?.trim() || null,
    },
  });
  return NextResponse.json({ ok: true, visit }, { status: 201 });
}
