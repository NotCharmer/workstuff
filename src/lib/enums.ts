/**
 * Application-layer string literal unions for fields that are stored as
 * plain strings in SQLite (Prisma on SQLite has no native enum support).
 *
 * Keep these in lockstep with the comments in prisma/schema.prisma.
 */

export const USER_ROLES = ["STAFF", "BRANCH_MANAGER", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["PENDING", "ACTIVE", "BLOCKED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const GRADE_SOURCES = ["MANUAL", "OCR", "IMPORT"] as const;
export type GradeSource = (typeof GRADE_SOURCES)[number];

export const NOTE_CATEGORIES = [
  "GENERAL",
  "BEHAVIOR",
  "PROGRESS",
  "CONCERN",
  "STRENGTH",
] as const;
export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

export const UPLOAD_STATUSES = [
  "PARSED",
  "REVIEWED",
  "SAVED",
  "DISCARDED",
] as const;
export type UploadStatus = (typeof UPLOAD_STATUSES)[number];

export const STUDENT_GENDERS = ["MALE", "FEMALE"] as const;
export type StudentGender = (typeof STUDENT_GENDERS)[number];

export const STUDENT_STATUSES = ["ACTIVE", "GRADUATED"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const REQUEST_KINDS = ["TUTORING", "EQUIPMENT"] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

export const REQUEST_STATUSES = ["OPEN", "DONE"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
