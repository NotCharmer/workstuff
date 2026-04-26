"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { dateLocaleHe } from "@/lib/i18n";

export function GradeTrend({
  data,
}: {
  data: { date: string; value: number; subject: string }[];
}) {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tickFormatter={(v) => format(new Date(v), "d MMM", { locale: dateLocaleHe })}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            fontSize={11}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              boxShadow: "0 8px 24px -6px rgba(15,23,42,0.12)",
            }}
            labelFormatter={(v) => format(new Date(v), "PP", { locale: dateLocaleHe })}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            fill="url(#gt)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
