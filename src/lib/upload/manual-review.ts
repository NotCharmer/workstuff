import type { ExtractedRow, ParseResult } from "@/lib/ocr/types";

export const PENDING_REVIEW_SESSION_KEY = "lebronator:pending-review";

export type PendingReview = ParseResult & { fileName: string; branchId: string };

export function createEmptyRow(): ExtractedRow {
  return {
    id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    studentName: "",
    externalId: "",
    className: "",
    subject: "",
    grade: 0,
    confidence: 1,
  };
}

export function createManualPendingReview(rowCount: number, branchId: string): PendingReview {
  const rows = Array.from({ length: Math.max(1, rowCount) }, () => createEmptyRow());
  return {
    fileName: "הזנה ידנית",
    branchId,
    rows,
    avgConfidence: 1,
    warnings: [],
  };
}

export function savePendingReviewToSession(payload: PendingReview) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_REVIEW_SESSION_KEY, JSON.stringify(payload));
}
