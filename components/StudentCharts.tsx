"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ReferenceLine,
  Cell,
} from "recharts";

const GRAD = "#4F46E5";
const GRAD_2 = "#7C3AED";

export function PaperTrendChart({
  data,
  predicted,
}: {
  data: { label: string; pct: number }[];
  predicted: number | null;
}) {
  const chartData = predicted != null ? [...data, { label: "Next (est.)", pct: predicted, est: true }] : data;
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E6E8F2" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9AA1B5" }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9AA1B5" }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #E6E8F2",
              fontSize: 13,
              fontFamily: "Inter, sans-serif",
            }}
            formatter={(v: number | string) => [`${v}%`, "Score"]}
          />
          <Line
            type="monotone"
            dataKey="pct"
            stroke={GRAD}
            strokeWidth={2.5}
            dot={{ r: 4, fill: GRAD, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
          {predicted != null && (
            <>
              <ReferenceLine x={chartData.length - 1} stroke="#9AA1B5" strokeDasharray="4 4" />
              <ReferenceDot
                x={chartData.length - 1}
                y={predicted}
                r={6}
                fill="#7C3AED"
                stroke="#fff"
                strokeWidth={2}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function QuizTrendChart({
  data,
}: {
  data: { label: string; pct: number }[];
}) {
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E6E8F2" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9AA1B5" }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9AA1B5" }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(79,70,229,0.06)" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #E6E8F2",
              fontSize: 13,
              fontFamily: "Inter, sans-serif",
            }}
            formatter={(v: number | string) => [`${v}%`, "Score"]}
          />
          <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={34}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.pct >= 60 ? GRAD : "#C7CBFB"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
