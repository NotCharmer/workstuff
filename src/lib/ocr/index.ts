import { getOcrProviderName } from "@/lib/server-env";
import { mockOcrProvider } from "./mock";
import { openaiVisionOcrProvider } from "./openai-vision";
import type { OcrProvider, ParseResult } from "./types";

export type { OcrProvider, ParseResult, ExtractedRow } from "./types";

/**
 * Resolve an OCR provider. Swap mock out for a real provider by setting
 * OCR_PROVIDER=openai|google|… See ./README.md.
 */
export function getOcrProvider(): OcrProvider {
  const name = getOcrProviderName();
  switch (name) {
    case "openai":
      return openaiVisionOcrProvider;
    case "mock":
    default:
      return mockOcrProvider;
  }
}

export async function parseGradeImage(
  file: { name: string; buffer: Buffer; mime: string }
): Promise<ParseResult> {
  const provider = getOcrProvider();
  return provider.parse(file);
}
