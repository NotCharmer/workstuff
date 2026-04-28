import { z } from "zod";
import { he } from "@/lib/i18n/he";

export const GradeRowSchema = z.object({
  id: z.string(),
  studentName: z.string().min(1, he.validators.nameRequired),
  externalId: z.string().optional().nullable(),
  className: z.string().optional().nullable(),
  subject: z.string().min(1, he.validators.subjectRequired),
  grade: z
    .number({ invalid_type_error: he.validators.gradeNumber })
    .min(0, he.validators.min0)
    .max(100, he.validators.max100),
  confidence: z.number().min(0).max(1).optional(),
});
export type GradeRow = z.infer<typeof GradeRowSchema>;

export const ReviewPayloadSchema = z.object({
  fileName: z.string(),
  rows: z.array(GradeRowSchema).min(1, he.validators.atLeastOneRow),
  avgConfidence: z.number().min(0).max(1).optional(),
  imagePath: z.string().optional(),
});
export type ReviewPayload = z.infer<typeof ReviewPayloadSchema>;

export const NoteSchema = z.object({
  body: z.string().min(2, he.validators.noteShort).max(2000),
  category: z.enum(["GENERAL", "BEHAVIOR", "PROGRESS", "CONCERN", "STRENGTH"]),
});
export type NoteInput = z.infer<typeof NoteSchema>;

export const ManualGradeSchema = z.object({
  subject: z.string().trim().min(1, he.validators.subjectRequired),
  value: z
    .number({ invalid_type_error: he.validators.gradeNumber })
    .min(0, he.validators.min0)
    .max(100, he.validators.max100),
  gradedAt: z.string().datetime().optional(),
});
export type ManualGradeInput = z.infer<typeof ManualGradeSchema>;

export const DailyTaskSchema = z.object({
  title: z.string().trim().min(1, "נדרש תוכן למשימה").max(500),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין"),
});
export type DailyTaskInput = z.infer<typeof DailyTaskSchema>;

export const PatchDailyTaskSchema = z.object({
  done: z.boolean().optional(),
  title: z.string().trim().min(1).max(500).optional(),
});
export type PatchDailyTaskInput = z.infer<typeof PatchDailyTaskSchema>;

export const ToggleImportantSubjectSchema = z.object({
  isImportant: z.boolean(),
});

export const PrivateLessonSchema = z.object({
  studentId: z.string().min(1, "נדרש תלמיד"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין"),
  durationMinutes: z
    .number({ invalid_type_error: "משך חייב להיות מספר" })
    .int()
    .min(5, "מינימום 5 דקות")
    .max(480, "מקסימום 480 דקות")
    .default(60),
  subject: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});
export type PrivateLessonInput = z.infer<typeof PrivateLessonSchema>;

export const PatchPrivateLessonSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין").optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  subject: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});
export type PatchPrivateLessonInput = z.infer<typeof PatchPrivateLessonSchema>;

export const ClassVisitSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין"),
  className: z.string().trim().min(1, "נדרשת כיתה").max(80),
  subject: z.string().trim().min(1, "נדרש מקצוע").max(120),
  durationMinutes: z
    .number({ invalid_type_error: "משך חייב להיות מספר" })
    .int()
    .min(5, "מינימום 5 דקות")
    .max(480, "מקסימום 480 דקות")
    .default(60),
  notes: z.string().trim().max(2000).optional().nullable(),
});
export type ClassVisitInput = z.infer<typeof ClassVisitSchema>;

export const PatchClassVisitSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין").optional(),
  className: z.string().trim().min(1).max(80).optional(),
  subject: z.string().trim().min(1).max(120).optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});
export type PatchClassVisitInput = z.infer<typeof PatchClassVisitSchema>;

export const TimetableRowSchema = z.object({
  id: z.string(),
  className: z.string().min(1),
  dayOfWeek: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  subject: z.string().min(1),
  teacher: z.string().optional().nullable(),
  room: z.string().optional().nullable(),
  confidence: z.number().min(0).max(1).optional(),
});

export const TimetablePayloadSchema = z.object({
  rows: z.array(TimetableRowSchema).min(1),
});
