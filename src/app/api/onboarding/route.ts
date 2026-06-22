import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { OnboardingSchema } from "@/lib/validators";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { he } from "@/lib/i18n/he";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser({ allowInactive: true });
    if (user.onboardingCompleted) {
      return NextResponse.json({ ok: false, error: he.onboarding.alreadyDone }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const parsed = OnboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const passwordHash = await hash(parsed.data.password, 12);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.fullName,
        passwordHash,
        onboardingCompleted: true,
      },
      select: {
        id: true,
        name: true,
        onboardingCompleted: true,
        status: true,
      },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: he.onboarding.saveFailed }, { status: 500 });
  }
}
