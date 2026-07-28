"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { he } from "@/lib/i18n/he";

export function SchoolYearSelect({
  currentSchoolYear,
  years,
  selectedYear,
}: {
  currentSchoolYear: string;
  years: string[];
  selectedYear: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(year: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (year === currentSchoolYear) {
      next.delete("year");
    } else {
      next.set("year", year);
    }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const options = Array.from(new Set([currentSchoolYear, ...years])).sort((a, b) =>
    b.localeCompare(a)
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="school-year" className="text-sm font-medium">
        {he.schoolYear.selectLabel}
      </label>
      <select
        id="school-year"
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        value={selectedYear}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((year) => (
          <option key={year} value={year}>
            {year === currentSchoolYear
              ? he.schoolYear.currentOption(year)
              : he.schoolYear.pastOption(year)}
          </option>
        ))}
      </select>
    </div>
  );
}
