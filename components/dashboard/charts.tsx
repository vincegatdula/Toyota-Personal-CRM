"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PALETTE = [
  "#d32f2f",
  "#1c1917",
  "#78716c",
  "#0f766e",
  "#b45309",
  "#1d4ed8",
  "#7c3aed",
  "#15803d",
  "#be185d",
  "#a8a29e",
];

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e7e5e3",
  backgroundColor: "#ffffff",
  color: "#1c1917",
  fontSize: 11,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  opacity: 1,
};

const tooltipLabelStyle = { color: "#1c1917", fontWeight: 600 };
const tooltipItemStyle = { color: "#44403c" };

export function MonthlyChart({
  data,
}: {
  data: { label: string; releases: number; prospects: number; closingRatio: number }[];
}) {
  return (
    <div className="h-[260px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="#efeeec" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#57534e" }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            yAxisId="left"
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "#57534e" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            allowDecimals
            tick={{ fontSize: 10, fill: "#57534e" }}
            axisLine={false}
            tickLine={false}
            width={28}
            tickFormatter={(v) => `${Math.round(Number(v) * 100)}%`}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            formatter={(value, name) => {
              if (name === "Closing ratio") return [`${(Number(value) * 100).toFixed(1)}%`, name];
              return [value, name];
            }}
          />
          <Bar
            yAxisId="left"
            dataKey="prospects"
            name="Prospects Created"
            fill="#2563eb"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
          <Bar
            yAxisId="left"
            dataKey="releases"
            name="Releases"
            fill="#d32f2f"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="closingRatio"
            name="Closing ratio"
            stroke="#1c1917"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "#1c1917" }}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({
  data,
  height = 220,
}: {
  data: { name: string; value: number }[];
  height?: number;
}) {
  return (
    <div className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="82%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RankedBars({
  data,
  height = 240,
  color = "#1c1917",
}: {
  data: { name: string; value: number }[];
  height?: number;
  color?: string;
}) {
  return (
    <div className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
        >
          <CartesianGrid stroke="#efeeec" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "#57534e" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 10, fill: "#44403c" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
          <Bar dataKey="value" name="Count" fill={color} radius={[0, 4, 4, 0]} maxBarSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
