import { NextResponse } from "next/server";
import { AuthError, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** ADMIN only — removes all students and cascaded grades/notes/private lessons. */
export async function POST() {
  try {
    await requireRole(["ADMIN"]);
    const [studentsBefore, gradesBefore, notesBefore] = await Promise.all([
      prisma.student.count(),
      prisma.grade.count(),
      prisma.note.count(),
    ]);

    await prisma.student.deleteMany();

    const [studentsAfter, gradesAfter, notesAfter] = await Promise.all([
      prisma.student.count(),
      prisma.grade.count(),
      prisma.note.count(),
    ]);

    return NextResponse.json({
      ok: true,
      deletedStudents: studentsBefore,
      gradesRemoved: gradesBefore - gradesAfter,
      notesRemoved: notesBefore - notesAfter,
      studentsRemaining: studentsAfter,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error("[admin/purge-students]", error);
    return NextResponse.json({ ok: false, error: "מחיקה נכשלה" }, { status: 500 });
  }
}
