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

export const ToggleImportantSubjectSchema = z.object({
  isImportant: z.boolean(),
});

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
