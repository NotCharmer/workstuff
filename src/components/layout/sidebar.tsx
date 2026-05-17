"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UploadCloud,
  LineChart,
  Settings,
  GraduationCap,
  CalendarDays,
  ListChecks,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { he } from "@/lib/i18n/he";
import { SchoolSwitcher } from "@/components/layout/school-switcher";

const NAV = [
  { href: "/dashboard", label: he.nav.dashboard, icon: LayoutDashboard },
  { href: "/students", label: he.nav.students, icon: Users },
  { href: "/upload", label: he.nav.upload, icon: UploadCloud },
  { href: "/timetable", label: he.nav.timetable, icon: CalendarDays },
  { href: "/daily-tasks", label: he.nav.dailyTasks, icon: ListChecks },
  { href: "/private-lessons", label: he.nav.privateLessons, icon: BookOpen },
  { href: "/daily-summary", label: he.nav.dailySummary, icon: Sparkles },
  { href: "/analytics", label: he.nav.analytics, icon: LineChart },
  { href: "/settings", label: he.nav.settings, icon: Settings },
];

export function Sidebar({ canSwitchSchools }: { canSwitchSchools: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-s border-border bg-card/60 backdrop-blur-sm md:flex">
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-500 text-primary-foreground shadow-glow">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight">{he.app.name}</div>
          <div className="text-[11px] text-muted-foreground">{he.app.tagline}</div>
        </div>
      </div>

      <SchoolSwitcher canSwitch={canSwitchSchools} />

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-transform",
                  active ? "scale-110" : "group-hover:scale-110"
                )}
              />
              <span>{item.label}</span>
              {active && <span className="ms-auto h-1.5 w-1.5 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border border-border bg-gradient-to-br from-primary/5 to-accent/40 p-4 text-xs">
        <div className="font-semibold text-foreground">{he.proTip.title}</div>
        <p className="mt-1 text-muted-foreground">{he.proTip.text}</p>
      </div>
    </aside>
  );
}
