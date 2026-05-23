export type ExtractedRow = {
  id: string;
  studentName: string;
  externalId?: string | null;
  className?: string | null;
  subject: string;
  grade: number;
  confidence: number; // 0-1
};

export type ParseResult = {
  branchId?: string;
  rows: ExtractedRow[];
  avgConfidence: number;
  rawText?: string;
  warnings: string[];
};

export type OcrFile = {
  name: string;
  buffer: Buffer;
  mime: string;
};

export interface OcrProvider {
  name: string;
  parse(file: OcrFile): Promise<ParseResult>;
}
