import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getOpenAIApiKey, getOpenAIOcrModel } from "@/lib/server-env";
import type { OcrFile, OcrProvider, ParseResult, ExtractedRow } from "./types";

/**
 * OpenAI "vision" OCR — שולח את תמונת הטבלה ל־Chat Completions (gpt-4o / gpt-4o-mini)
 * ומבקש JSON של שורות: תלמיד, מקצוע, ציון.
 *
 * דורש: OPENAI_API_KEY ב־.env
 * אופציונלי: OPENAI_OCR_MODEL (ברירת מחדל בקוד: gpt-4o)
 *
 * הערה: API התמונה מקבל רק פורמטי תמונה. PDF לא נתמך כאן — יש להמיר ל־תמונה.
 */

const GptTableSchema = z.object({
  rows: z
    .array(
      z.object({
        studentName: z.string(),
        subject: z.string(),
        grade: z.coerce.number(),
        className: z.string().nullable().optional(),
        externalId: z.string().nullable().optional(),
        confidence: z.coerce.number().min(0).max(1).optional(),
      })
    )
    .default([]),
  warnings: z.array(z.string()).optional(),
});

const SYSTEM =
  "You are an expert at reading school grade tables from photos. " +
  "The image may be rotated, in Hebrew (RTL) or other languages, with handwriting or highlights. " +
  "Return ONLY valid JSON, no markdown. " +
  'Schema: {"rows":[{"studentName":string,"subject":string,"grade":number(0-100), "className"?:string|null, "externalId"?:string|null, "confidence"?:number 0-1}],"warnings"?:string[]}. ' +
  "If the table has students as rows and subjects as columns, emit ONE object per (student, subject, cell grade). " +
  "Use Hebrew text in studentName and subject as printed. " +
  "If unsure about a value, set a lower confidence (0.3-0.6) and add a short note to warnings.";

function toDataUrl(mime: string, buffer: Buffer): string {
  const b64 = buffer.toString("base64");
  return `data:${mime};base64,${b64}`;
}

function parseContentJson(text: string): unknown {
  const t = text.trim();
  if (t.startsWith("```")) {
    const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m?.[1]) return JSON.parse(m[1].trim());
  }
  return JSON.parse(t);
}

export const openaiVisionOcrProvider: OcrProvider = {
  name: "openai",
  async parse(file: OcrFile): Promise<ParseResult> {
    const key = getOpenAIApiKey();
    if (!key) {
      return {
        rows: [],
        avgConfidence: 0,
        warnings: [
          "הגדר OPENAI_API_KEY בקובץ .env כדי להשתמש ב־OCR של OpenAI.",
        ],
        rawText: undefined,
      };
    }

    if (!file.mime.startsWith("image/")) {
      return {
        rows: [],
        avgConfidence: 0,
        warnings: [
          "מספק OpenAI (ראייה) עובד רק עם קבצי תמונה (PNG, ‏JPEG, ‏WebP). המירו PDF לתמונה או בחרו תמונה.",
        ],
        rawText: undefined,
      };
    }

    if (file.mime === "image/heic" || file.mime === "image/heif") {
      return {
        rows: [],
        avgConfidence: 0,
        warnings: [
          "פורמט HEIC/HEIF לא נתמך ב־API של OpenAI. בטלפון: ״העתק״/ייצא כ־JPEG, או המירו ל־JPG/PNG ונסו שוב.",
        ],
        rawText: undefined,
      };
    }

    const model = getOpenAIOcrModel();
    const dataUrl = toDataUrl(file.mime, file.buffer);

    const userText =
      `File name: ${file.name}\n` +
      "Read all grade cells from this school grade table. " +
      "Output JSON with the schema described in the system message. " +
      "If the image is rotated, mentally rotate and still extract correctly.";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 16384,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
            ],
          },
        ],
      }),
    });

    const raw = await res.json();
    if (!res.ok) {
      const msg =
        (raw as { error?: { message?: string } })?.error?.message ??
        `OpenAI error (${res.status})`;
      return {
        rows: [],
        avgConfidence: 0,
        warnings: [msg],
        rawText: JSON.stringify(raw).slice(0, 2000),
      };
    }

    const content = (raw as { choices?: { message?: { content?: string } }[] })
      ?.choices?.[0]?.message?.content;
    if (!content) {
      return {
        rows: [],
        avgConfidence: 0,
        warnings: ["אין תוכן תשובה מ־OpenAI."],
        rawText: JSON.stringify(raw).slice(0, 2000),
      };
    }

    let parsed: z.infer<typeof GptTableSchema>;
    try {
      const json = parseContentJson(content);
      const safe = GptTableSchema.safeParse(json);
      if (!safe.success) {
        return {
          rows: [],
          avgConfidence: 0,
          warnings: [
            "התשובה מ־GPT לא הייתה בפורמט הצפוי: " + safe.error.message,
          ],
          rawText: content.slice(0, 4000),
        };
      }
      parsed = safe.data;
    } catch (e) {
      return {
        rows: [],
        avgConfidence: 0,
        warnings: [
          "כשל בפענוח JSON: " + String((e as Error).message),
        ],
        rawText: content.slice(0, 4000),
      };
    }

    const rows: ExtractedRow[] = parsed.rows.map((r) => {
      const g = Math.min(100, Math.max(0, Number.isFinite(r.grade) ? r.grade : 0));
      const c =
        r.confidence != null && r.confidence >= 0 && r.confidence <= 1
          ? r.confidence
          : 0.85;
      return {
        id: randomUUID(),
        studentName: r.studentName.trim() || "—",
        subject: r.subject.trim() || "—",
        grade: g,
        className: r.className?.toString().trim() || null,
        externalId: r.externalId?.toString().trim() || null,
        confidence: Number(c.toFixed(2)),
      };
    });

    const warnings = [...(parsed.warnings ?? [])];
    for (const row of rows) {
      if (row.confidence < 0.75) {
        warnings.push(
          `בדיקה מומלצת: ${row.studentName} · ${row.subject} (ביטחון ${row.confidence})`
        );
      }
    }
    if (rows.length === 0) {
      warnings.unshift("המודל לא זיהה שורות. נסו תמונה חדה יותר, תאורה אחידה, או gpt-4o במקום gpt-4o-mini.");
    }

    const avg =
      rows.length > 0
        ? rows.reduce((s, r) => s + r.confidence, 0) / rows.length
        : 0;

    return {
      rows,
      avgConfidence: Number(avg.toFixed(2)) || 0.75,
      warnings,
      rawText: content.slice(0, 5000),
    };
  },
};
