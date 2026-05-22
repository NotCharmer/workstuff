import { NextResponse } from "next/server";
import { AuthError, requireRole } from "@/lib/auth";
import { requireViewBranchId } from "@/lib/branch-scope";
import { prisma } from "@/lib/db";

/** ADMIN only — removes students in the active school and cascaded grades/notes/private lessons. */
export async function POST() {
  try {
    const user = await requireRole(["ADMIN"]);
    const branchId = await requireViewBranchId(user);
    const [studentsBefore, gradesBefore, notesBefore] = await Promise.all([
      prisma.student.count({ where: { branchId } }),
      prisma.grade.count({ where: { student: { branchId } } }),
      prisma.note.count({ where: { student: { branchId } } }),
    ]);

    await prisma.student.deleteMany({ where: { branchId } });

    const [studentsAfter, gradesAfter, notesAfter] = await Promise.all([
      prisma.student.count({ where: { branchId } }),
      prisma.grade.count({ where: { student: { branchId } } }),
      prisma.note.count({ where: { student: { branchId } } }),
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
