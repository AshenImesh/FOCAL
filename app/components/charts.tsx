"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type PaperPoint = { label: string; pct: number };
export type ForecastPoint = { label: string; pct: number };

export function PaperTrendChart({
  actuals,
  forecasts,
}: {
  actuals: PaperPoint[];
  forecasts: ForecastPoint[];
}) {
  const data = [
    ...actuals.map((p, i) => ({
      label: p.label,
      score: p.pct,
      forecast: i === actuals.length - 1 ? p.pct : null,
    })),
    ...forecasts.map((f) => ({
      label: f.label,
      score: null as number | null,
      forecast: f.pct,
    })),
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--faint)", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "var(--faint)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          unit="%"
        />
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(v: number | string, name: string) => [
            `${v}%`,
            name === "score" ? "Score" : "Forecast",
          ]}
        />
        <ReferenceLine
          y={75}
          stroke="var(--good-line)"
          strokeDasharray="4 4"
          label={{ value: "A grade", fill: "var(--faint)", fontSize: 10, position: "insideTopRight" }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="var(--accent)"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "var(--accent)", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="forecast"
          stroke="var(--accent-2)"
          strokeWidth={2.5}
          strokeDasharray="6 4"
          dot={{ r: 4, fill: "var(--accent-2)", strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function QuizBarChart({ data }: { data: { label: string; pct: number }[] }) {
  const color = (pct: number) =>
    pct >= 75 ? "var(--good)" : pct >= 40 ? "var(--warn)" : "var(--bad)";

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--faint)", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "var(--faint)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          unit="%"
        />
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(v: number | string) => [`${v}%`, "Score"]}
        />
        <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={42}>
          {data.map((d, i) => (
            <Cell key={i} fill={color(d.pct)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
