import crypto from "node:crypto";
import type { OcrProvider, ParseResult, ExtractedRow } from "./types";

/**
 * Mock OCR provider.
 * Generates plausible but intentionally noisy extraction results so the
 * "Review extracted data" UI has something meaningful to work with.
 *
 * Deterministic per-file: same image bytes produce the same rows, so reloads
 * during review don't shuffle things under you.
 */

const SAMPLE_NAMES = [
  ["Amelia", "Carter"],
  ["Noah", "Bennett"],
  ["Olivia", "Hughes"],
  ["Liam", "Patel"],
  ["Sophia", "Rivera"],
  ["Ethan", "Nakamura"],
  ["Isabella", "Wright"],
  ["Mason", "Alvarez"],
  ["Mia", "Kowalski"],
  ["Lucas", "Fischer"],
  ["Harper", "Singh"],
  ["Jackson", "Okafor"],
];

const SAMPLE_SUBJECTS = [
  "Mathematics",
  "English Literature",
  "Biology",
  "Chemistry",
  "History",
  "Physics",
  "Geography",
  "Computer Science",
];

const CLASS_NAMES = ["10-A", "10-B", "11-A", "11-B"];

function hashToSeed(buf: Buffer) {
  const h = crypto.createHash("sha1").update(buf).digest();
  // 32-bit seed from first 4 bytes
  return h.readUInt32BE(0);
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

export const mockOcrProvider: OcrProvider = {
  name: "mock",
  async parse(file): Promise<ParseResult> {
    // Simulate latency
    await new Promise((r) => setTimeout(r, 900));

    const rand = mulberry32(hashToSeed(file.buffer));
    const rowCount = 6 + Math.floor(rand() * 7); // 6-12 rows
    const subjectForFile = pick(SAMPLE_SUBJECTS, rand);
    const classForFile = pick(CLASS_NAMES, rand);

    const used = new Set<number>();
    const rows: ExtractedRow[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < rowCount; i++) {
      let idx = Math.floor(rand() * SAMPLE_NAMES.length);
      while (used.has(idx)) idx = (idx + 1) % SAMPLE_NAMES.length;
      used.add(idx);

      const [first, last] = SAMPLE_NAMES[idx];
      const baseGrade = 55 + Math.floor(rand() * 46); // 55..100
      const confidence = 0.72 + rand() * 0.27;

      // Simulate common OCR mistakes: occasional character swaps & low-confidence rows
      const nameNoise = rand() < 0.12 ? first.replace(/a/gi, "@") : first;
      const idVisible = rand() > 0.25;
      const extId = idVisible ? `S${(10000 + idx * 7 + Math.floor(rand() * 50)).toString()}` : null;

      if (confidence < 0.8) warnings.push(`Low confidence on row ${i + 1} — please verify.`);

      rows.push({
        id: `row_${i}_${idx}`,
        studentName: `${nameNoise} ${last}`,
        externalId: extId,
        className: classForFile,
        subject: subjectForFile,
        grade: baseGrade,
        confidence: Number(confidence.toFixed(2)),
      });
    }

    const avg =
      rows.reduce((s, r) => s + r.confidence, 0) / Math.max(1, rows.length);

    if (avg < 0.82) {
      warnings.unshift("Overall extraction confidence is moderate — please review carefully.");
    }

    return {
      rows,
      avgConfidence: Number(avg.toFixed(2)),
      warnings,
    };
  },
};
