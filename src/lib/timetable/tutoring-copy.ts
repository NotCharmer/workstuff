import { sameClassName } from "@/lib/timetable/marks";
import { formatTutoringWhen } from "@/lib/tutoring";

export type TutoringCopyCadet = {
  firstName: string;
  lastName: string;
  className: string | null;
  urgencyLabel?: string | null;
  urgencyRank?: number;
  scheduledFor?: string | null;
};

export type TutoringCopyPull = {
  className: string;
  subject: string;
};

/** Plain-text list grouped by class: class and subjects, then cadet names. */
export function formatTutoringCadetsCopy(
  cadets: TutoringCopyCadet[],
  pulls: TutoringCopyPull[],
  noClassLabel: string,
  scheduledPrefix = "נקבע"
): string {
  const groups: {
    label: string;
    className: string | null;
    members: { line: string; rank: number; name: string }[];
  }[] = [];
  const indexByKey = new Map<string, number>();

  for (const cadet of cadets) {
    const className = (cadet.className ?? "").trim().replace(/\s+/g, " ");
    const key = className || "\0";
    let idx = indexByKey.get(key);
    if (idx === undefined) {
      idx = groups.length;
      indexByKey.set(key, idx);
      groups.push({
        label: className || noClassLabel,
        className: className || null,
        members: [],
      });
    }
    const name = `${cadet.firstName} ${cadet.lastName}`.trim();
    if (!name) continue;
    const bits = [name];
    if (cadet.urgencyLabel) bits.push(cadet.urgencyLabel);
    const when = formatTutoringWhen(cadet.scheduledFor);
    if (when) bits.push(`${scheduledPrefix}: ${when}`);
    groups[idx].members.push({
      line: bits.join(" — "),
      rank: cadet.urgencyRank ?? 99,
      name,
    });
  }

  const blocks: string[] = [];
  for (const group of groups) {
    group.members.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "he"));
    const subjects: string[] = [];
    const seen = new Set<string>();
    if (group.className) {
      for (const pull of pulls) {
        if (!sameClassName(pull.className, group.className)) continue;
        const subject = pull.subject.trim();
        if (!subject || seen.has(subject)) continue;
        seen.add(subject);
        subjects.push(subject);
      }
    }
    const head = subjects.length > 0 ? `${group.label} — ${subjects.join(", ")}` : group.label;
    blocks.push([head, ...group.members.map((member) => member.line)].join("\n"));
  }

  return blocks.join("\n\n");
}
