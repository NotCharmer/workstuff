# OCR Service Layer

The UI only talks to `parseGradeImage` from `src/lib/ocr/index.ts`. The
actual extraction lives behind the `OcrProvider` interface so you can swap
providers without touching any page or API route.

## Files

- `types.ts` — `OcrProvider`, `ParseResult`, `ExtractedRow` contracts.
- `mock.ts` — deterministic fake extraction used for the MVP.
- `index.ts` — provider factory driven by `OCR_PROVIDER` env var.

## Plugging in a real provider

Create a new file, e.g. `google.ts`:

```ts
import type { OcrProvider } from "./types";

export const googleOcrProvider: OcrProvider = {
  name: "google",
  async parse(file) {
    // 1) Call Google Document AI / Vision with file.buffer
    // 2) Map the returned table rows into { studentName, subject, grade, ... }
    // 3) Return { rows, avgConfidence, warnings }
    throw new Error("not implemented");
  },
};
```

Then register it in `index.ts` and set `OCR_PROVIDER=...` in `.env`.

## OpenAI (GPT vision) — מוכן לשימוש

`OCR_PROVIDER=openai` + `OPENAI_API_KEY` ב־`.env`. אופציונלי: `OPENAI_OCR_MODEL` (ברירת מחדל `gpt-4o-mini`).

- שולח את **תמונת** הטבלה (PNG / JPEG / WebP) — **לא PDF** (המירו לתמונה).
- המודל מחזיר JSON; אחר־כך הזרימה (בדיקה + שמירה) כרגיל.
- לטבלאות עמוסות / עברית, נסו `OPENAI_OCR_MODEL=gpt-4o`.

## Suggested providers

| Provider | Strengths |
|----------|-----------|
| Google Document AI "Form Parser" | best for structured tables |
| Azure Document Intelligence `prebuilt-layout` | similar, strong cell detection |
| AWS Textract `AnalyzeDocument (TABLES)` | solid table recovery |
| OpenAI `gpt-4o` vision / Anthropic `claude-3.5-sonnet` vision | great for messy or handwritten tables, returns structured JSON easily |

Whatever you pick, return confidences on each cell so the review UI can
surface uncertain rows.
