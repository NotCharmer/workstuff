import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, getCurrentUser } from "@/lib/auth";

const OnboardingSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  requestedBranchCode: z.string().trim().min(2).max(40),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser({ allowInactive: true });
    const body = await req.json().catch(() => null);
    const parsed = OnboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.fullName,
        requestedBranchCode: parsed.data.requestedBranchCode,
        onboardingCompleted: true,
      },
      select: { id: true, onboardingCompleted: true, requestedBranchCode: true },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Failed to submit onboarding" }, { status: 500 });
  }
}
