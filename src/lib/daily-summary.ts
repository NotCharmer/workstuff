/**
 * Builds the daily WhatsApp-style summary used by the staff group.
 * Pure function — no DB / network — so it is fully testable and deterministic.
 */

export type DailySummaryEvent =
  | {
      kind: "private";
      className: string | null;
      studentName: string;
      studentGender?: "MALE" | "FEMALE" | null;
      subject: string | null;
      durationMinutes: number;
    }
  | {
      kind: "visit";
      className: string;
      subject: string;
      durationMinutes: number;
    };

export type DailySummaryConfig = {
  programTitle: string;
  schoolLine: string;
  greetingLine: string;
  team: string[];
};

export const DEFAULT_SUMMARY_CONFIG: DailySummaryConfig = {
  programTitle: "סיכום יום מסלול השוחרות חיל הקשר, התקשוב והסייבר",
  schoolLine: "קריית החינוך אורט רחובות",
  greetingLine: "יום מעולה🌅",
  team: ["גל", "שמעון", "איתי", "נגה", "אנה", "מיקי", "יובל", "בן", "ארטימס"],
};

const FALLBACK_CLASS = "ללא כיתה";
const FALLBACK_SUBJECT = "שיעור";

/**
 * Subject → emoji map. Matched by case-insensitive substring against the
 * subject text. Any subject not matched falls back to a heart of a color
 * not yet used in the same summary (see buildEmojiResolver).
 */
const SUBJECT_EMOJI: Array<[string, string]> = [
  ["חשמל", "⚡"],
  ["אלקטרוניקה", "⚡"],
  ["electricity", "⚡"],
  ["פייתון", "🐍"],
  ["python", "🐍"],
  ["פיסיקה", "⚛️"],
  ["פיזיקה", "⚛️"],
  ["physics", "⚛️"],
  ["כימיה", "🧪"],
  ["chemistry", "🧪"],
  ["ביולוגיה", "🧬"],
  ["biology", "🧬"],
  ["מתמטיקה", "📐"],
  ["math", "📐"],
  ["אנגלית", "🇬🇧"],
  ["english", "🇬🇧"],
  ["ספרות", "📚"],
  ["literature", "📚"],
  ["תנך", "📖"],
  ["היסטוריה", "🏛️"],
  ["history", "🏛️"],
  ["חינוך גופני", "🏃"],
  ["sport", "🏃"],
  ["מיתוג", "🌐"],
  ["רובוטיקה", "🤖"],
  ["robot", "🤖"],
  ["לוגיקה", "🧠"],
  ["logic", "🧠"],
  ["תעבורה", "🚗"],
  ["הנדסה", "🛠️"],
  ["מעבדה", "🔬"],
  ["מחשב", "💻"],
];

const HEART_PALETTE = [
  "💙",
  "💚",
  "💛",
  "🧡",
  "❤️",
  "💜",
  "🤎",
  "🩵",
  "🩷",
  "🩶",
  "🤍",
  "🖤",
];

type EmojiResolver = (subject: string) => string;

function buildEmojiResolver(): EmojiResolver {
  // Tracks every emoji already used in this summary so each line is unique.
  const used = new Set<string>();
  let cycle = 0;

  return (subject: string) => {
    const key = subject.trim();

    if (key) {
      const lower = key.toLowerCase();
      for (const [token, emoji] of SUBJECT_EMOJI) {
        if (lower.includes(token.toLowerCase()) && !used.has(emoji)) {
          used.add(emoji);
          return emoji;
        }
      }
    }

    for (const h of HEART_PALETTE) {
      if (!used.has(h)) {
        used.add(h);
        return h;
      }
    }

    const wrapped = HEART_PALETTE[cycle % HEART_PALETTE.length];
    cycle += 1;
    return wrapped;
  };
}

function formatDateDdMmYyyy(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}

function hoursWord(hours: number): string {
  if (hours === 1) return "שעה";
  if (hours === 2) return "שעתיים";
  return `${hours} שעות`;
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "";
  if (minutes % 60 === 0) return hoursWord(minutes / 60);
  return `${minutes} דקות`;
}

function formatTeamLine(team: string[]): string {
  const trimmed = team.map((name) => name.trim()).filter(Boolean);
  if (trimmed.length === 0) return "אלה כל העדכונים להיום🤍";
  if (trimmed.length === 1) return `אלה כל העדכונים להיום ${trimmed[0]}🤍`;
  const head = trimmed.slice(0, -1).join(", ");
  const tail = trimmed[trimmed.length - 1];
  return `אלה כל העדכונים להיום ${head} ו${tail}🤍`;
}

function formatPrivateLine(
  e: Extract<DailySummaryEvent, { kind: "private" }>,
  emojiFor: EmojiResolver
): string {
  const hours = e.durationMinutes / 60;
  const prefix =
    hours === 3
      ? "התקיים תגבור *משולש*"
      : hours === 4
        ? "התקיים תגבור *מרובע*"
        : hours === 5
          ? "התקיים תגבור *מחומש*"
          : hours === 6
            ? "התקיים תגבור *שש שעות*"
            : e.durationMinutes >= 120
              ? "התקיים תגבור כפול"
              : "התקיים תגבור";
  const subject = e.subject?.trim() || FALLBACK_SUBJECT;
  const inSubject = subject.startsWith("ב") ? subject : `ב${subject}`;
  const cadetNoun =
    e.studentGender === "FEMALE"
      ? "לשוחרת"
      : "לשוחר";
  return `${prefix} ${cadetNoun} ${e.studentName} ${inSubject}${emojiFor(subject)}`;
}

function formatVisitLine(
  e: Extract<DailySummaryEvent, { kind: "visit" }>,
  emojiFor: EmojiResolver
): string {
  if (e.durationMinutes >= 120) {
    return `סגל המפקדים נכח ב${formatDuration(e.durationMinutes)} ${e.subject}${emojiFor(e.subject)}`;
  }
  return `הסגל נכח בשיעור ${e.subject}${emojiFor(e.subject)}`;
}

function classKeyAndLabel(className?: string | null): { key: string; label: string } {
  const normalizedLabel = (className ?? "").trim().replace(/\s+/g, " ");
  if (!normalizedLabel) return { key: FALLBACK_CLASS, label: FALLBACK_CLASS };
  const key = normalizedLabel
    .replace(/\s+/g, "")
    .replace(/[׳'"]/g, "")
    .toLowerCase();
  return { key, label: normalizedLabel };
}

function groupByClass<E extends { className?: string | null }>(
  events: E[]
): Map<string, { label: string; items: E[] }> {
  const groups = new Map<string, { label: string; items: E[] }>();
  for (const e of events) {
    const { key, label } = classKeyAndLabel(e.className);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { label, items: [e] });
      continue;
    }
    existing.items.push(e);
  }
  return groups;
}

export function buildDailySummary(
  date: string,
  events: DailySummaryEvent[],
  cfg: DailySummaryConfig = DEFAULT_SUMMARY_CONFIG
): string {
  const header = [
    cfg.programTitle,
    cfg.schoolLine,
    `תאריך ${formatDateDdMmYyyy(date)}`,
    cfg.greetingLine,
  ].join("\n");

  const groups = groupByClass(events);
  const orderedClasses = [...groups.entries()].sort((a, b) =>
    a[1].label.localeCompare(b[1].label, "he")
  );
  const emojiFor = buildEmojiResolver();

  const sections: string[] = [];
  for (const [, group] of orderedClasses) {
    const items = group.items;
    items.sort((a, b) => Number(a.kind === "private") - Number(b.kind === "private"));
    const lines = items.map((e) =>
      e.kind === "private" ? formatPrivateLine(e, emojiFor) : formatVisitLine(e, emojiFor)
    );
    sections.push(`${group.label}:\n${lines.join("\n")}`);
  }

  const body = sections.length
    ? sections.join("\n\n")
    : "אין עדכונים להיום.";

  return [header, "", body, "", formatTeamLine(cfg.team)].join("\n");
}
