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
