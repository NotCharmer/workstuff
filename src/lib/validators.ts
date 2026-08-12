import { z } from "zod";
import { he } from "@/lib/i18n/he";
import { STUDENT_GENDERS } from "@/lib/enums";
import { USER_ROLES } from "@/lib/enums";
import { USER_STATUSES } from "@/lib/enums";

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
  /** Omit or null for general branch task; user id for personal task. */
  assigneeId: z.string().min(1).nullable().optional(),
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

export const StudentGenderSchema = z.enum(STUDENT_GENDERS);
export type StudentGenderInput = z.infer<typeof StudentGenderSchema>;

export const PatchStudentSchema = z.object({
  gender: StudentGenderSchema.nullable().optional(),
});
export type PatchStudentInput = z.infer<typeof PatchStudentSchema>;

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

export const TimetableClassRevisionSchema = z.object({
  className: z.string().min(1),
  /** ISO timestamp of the newest row the editor loaded for this class. */
  maxUpdatedAt: z.string().min(1),
});

export const TimetablePayloadSchema = z.object({
  rows: z.array(TimetableRowSchema).min(1),
  /**
   * Optional optimistic-concurrency baselines from the editable grid.
   * When present, confirm rejects the save if any listed class changed on the server.
   * Import/uploader saves omit this and keep full replace semantics.
   */
  expectedRevisions: z.array(TimetableClassRevisionSchema).optional(),
});

export const AdminBranchCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9\-]+$/i, "Branch code must be letters, numbers, or hyphen"),
  name: z.string().trim().min(2).max(120),
});

export const AdminUserCreateSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(120),
  password: z.string().min(8).max(200),
  role: z.enum(USER_ROLES),
  branchId: z.string().min(1),
});

/** Staff completes profile after first login (name + personal password). */
export const OnboardingSchema = z.object({
  fullName: z.string().trim().min(2, he.validators.nameRequired).max(120),
  password: z.string().min(8).max(200),
});

/** Self-registration after passing the staff entry gate. */
export const StaffRegisterSchema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(2, he.validators.nameRequired).max(120),
  password: z.string().min(8).max(200),
  branchCodes: z.array(z.string().trim().min(1)).min(1, he.register.branchRequired),
});

/** Internal user created inside the app (after NextAuth login). */
export const TeamUserCreateSchema = z.object({
  email: z.string().trim().email(),
  /** Optional — staff sets their name on first login if omitted. */
  name: z.string().trim().min(2).max(120).optional(),
  /** Temporary first-login password; staff replaces it on onboarding. Omit for DEFAULT_STAFF_PASSWORD. */
  password: z.string().min(8).max(200).optional(),
});

export const TeamUserPatchSchema = z.object({
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  password: z.string().min(8).max(200).optional(),
});

export const AdminUserPatchSchema = z.object({
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  branchId: z.string().min(1).optional(),
  password: z.string().min(8).max(200).optional(),
});
