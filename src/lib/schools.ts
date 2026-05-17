/** Canonical school branches — keep in sync with DB seed / setup-schools script. */
export const SCHOOLS = [
  { code: "rehovot", name: "רחובות" },
  { code: "tel-aviv", name: "תל אביב" },
  { code: "herzliya", name: "הרצליה" },
] as const;

export type SchoolCode = (typeof SCHOOLS)[number]["code"];

export const SCHOOL_CODES = SCHOOLS.map((s) => s.code);

export function schoolNameForCode(code: string): string | undefined {
  return SCHOOLS.find((s) => s.code === code)?.name;
}
