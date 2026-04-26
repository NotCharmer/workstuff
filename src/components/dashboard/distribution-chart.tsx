"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

const BUCKET_COLORS: Record<string, string> = {
  "0-59": "#f43f5e",
  "60-69": "#f59e0b",
  "70-79": "#0ea5e9",
  "80-89": "#6366f1",
  "90-100": "#10b981",
};

export function DistributionChart({
  data,
}: {
  data: { bucket: string; count: number }[];
}) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="bucket"
            stroke="hsl(var(--muted-foreground))"
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            fontSize={12}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              boxShadow: "0 8px 24px -6px rgba(15,23,42,0.12)",
            }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Bar dataKey="count" radius={[8, 8, 4, 4]}>
            {data.map((d) => (
              <Cell key={d.bucket} fill={BUCKET_COLORS[d.bucket] ?? "#6366f1"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
