export type TimetableRow = {
  id: string;
  className: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacher?: string | null;
  room?: string | null;
  confidence?: number;
};

export type TimetableParseResult = {
  branchId?: string;
  rows: TimetableRow[];
  avgConfidence: number;
  warnings: string[];
  rawText?: string;
};
