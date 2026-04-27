import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getOpenAIApiKey, getOpenAIOcrModel } from "@/lib/server-env";
import type { TimetableParseResult } from "./types";

const TimetableSchema = z.object({
  rows: z
    .array(
      z.object({
        className: z.string(),
        dayOfWeek: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        subject: z.string(),
        teacher: z.string().nullable().optional(),
        room: z.string().nullable().optional(),
        confidence: z.coerce.number().min(0).max(1).optional(),
      })
    )
    .default([]),
  warnings: z.array(z.string()).optional(),
});

function toDataUrl(mime: string, buffer: Buffer): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function parseJson(text: string): unknown {
  const t = text.trim();
  if (t.startsWith("```")) {
    const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m?.[1]) return JSON.parse(m[1].trim());
  }
  return JSON.parse(t);
}

export async function parseTimetableImage(file: {
  name: string;
  buffer: Buffer;
  mime: string;
}): Promise<TimetableParseResult> {
  const key = getOpenAIApiKey();
  if (!key) {
    return {
      rows: [],
      avgConfidence: 0,
      warnings: ["הגדר OPENAI_API_KEY כדי לחלץ מערכת שעות מתמונה."],
    };
  }
  if (!file.mime.startsWith("image/")) {
    return {
      rows: [],
      avgConfidence: 0,
      warnings: ["חילוץ מערכת שעות מתמונה תומך רק בקבצי תמונה."],
    };
  }

  const dataUrl = toDataUrl(file.mime, file.buffer);
  const model = getOpenAIOcrModel();
  const system =
    "Extract class timetable rows from image and return ONLY JSON. " +
    'Schema: {"rows":[{"className":string,"dayOfWeek":string,"startTime":string,"endTime":string,"subject":string,"teacher"?:string|null,"room"?:string|null,"confidence"?:number}],"warnings"?:string[]}.';

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: `Read timetable from ${file.name}. Keep times as shown.` },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
    }),
  });

  const raw = await res.json();
  if (!res.ok) {
    return {
      rows: [],
      avgConfidence: 0,
      warnings: [(raw as { error?: { message?: string } })?.error?.message ?? "OCR error"],
      rawText: JSON.stringify(raw).slice(0, 2000),
    };
  }

  const content = (raw as { choices?: { message?: { content?: string } }[] })?.choices?.[0]
    ?.message?.content;
  if (!content) {
    return { rows: [], avgConfidence: 0, warnings: ["אין תוכן תשובה מה־OCR."] };
  }

  try {
    const safe = TimetableSchema.safeParse(parseJson(content));
    if (!safe.success) {
      return {
        rows: [],
        avgConfidence: 0,
        warnings: ["פורמט תשובה לא תקין: " + safe.error.message],
        rawText: content.slice(0, 3000),
      };
    }

    const rows = safe.data.rows.map((r) => ({
      id: randomUUID(),
      className: r.className.trim(),
      dayOfWeek: r.dayOfWeek.trim(),
      startTime: r.startTime.trim(),
      endTime: r.endTime.trim(),
      subject: r.subject.trim(),
      teacher: r.teacher?.trim() || null,
      room: r.room?.trim() || null,
      confidence: r.confidence ?? 0.85,
    }));
    const avgConfidence = rows.length
      ? rows.reduce((s, r) => s + (r.confidence ?? 0.85), 0) / rows.length
      : 0;

    return {
      rows,
      avgConfidence: Number(avgConfidence.toFixed(2)),
      warnings: safe.data.warnings ?? [],
      rawText: content.slice(0, 5000),
    };
  } catch (e) {
    return {
      rows: [],
      avgConfidence: 0,
      warnings: ["כשל בפענוח תשובת OCR: " + String((e as Error).message)],
      rawText: content.slice(0, 3000),
    };
  }
}
