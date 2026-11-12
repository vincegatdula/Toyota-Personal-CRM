"use client";

import { useSyncExternalStore } from "react";
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

export const CHART_SERIES = [
  "var(--color-brand)",
  "var(--color-info)",
  "var(--color-warning)",
  "var(--color-success)",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#64748b",
];

function useChartTheme() {
  const mounted = useSyncExternalStore(
    (cb) => {
      const obs = new MutationObserver(cb);
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
      return () => obs.disconnect();
    },
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
  const dark = mounted;

  const grid = dark ? "rgba(255,255,255,0.08)" : "var(--color-border)";
  const axis = "var(--color-muted-foreground)";
  const tooltipStyle = {
    borderRadius: 10,
    border: `1px solid var(--color-border)`,
    backgroundColor: "var(--color-popover)",
    color: "var(--color-foreground)",
    fontSize: 11,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    opacity: 1,
  };
  const tooltipLabelStyle = { color: "var(--color-foreground)", fontWeight: 600 };
  const tooltipItemStyle = { color: "var(--color-muted-foreground)" };

  return {
    grid,
    axis,
    tooltipStyle,
    tooltipLabelStyle,
    tooltipItemStyle,
    prospects: dark ? "#60A5FA" : "#2563eb",
    releases: dark ? "#FB7185" : "#d32f2f",
    ratio: "var(--color-foreground)",
    palette: CHART_SERIES,
  };
}

export function MonthlyChart({
  data,
}: {
  data: { label: string; releases: number; prospects: number; closingRatio: number }[];
}) {
  const t = useChartTheme();
  return (
    <div className="h-[260px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid stroke={t.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: t.axis }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            yAxisId="left"
            allowDecimals={false}
            tick={{ fontSize: 10, fill: t.axis }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            allowDecimals
            tick={{ fontSize: 10, fill: t.axis }}
            axisLine={false}
            tickLine={false}
            width={28}
            tickFormatter={(v) => `${Math.round(Number(v) * 100)}%`}
          />
          <Tooltip
            contentStyle={t.tooltipStyle}
            labelStyle={t.tooltipLabelStyle}
            itemStyle={t.tooltipItemStyle}
            formatter={(value, name) => {
              if (name === "Closing ratio") return [`${(Number(value) * 100).toFixed(1)}%`, name];
              return [value, name];
            }}
          />
          <Bar
            yAxisId="left"
            dataKey="prospects"
            name="Prospects Created"
            fill={t.prospects}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
          <Bar
            yAxisId="left"
            dataKey="releases"
            name="Releases"
            fill={t.releases}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="closingRatio"
            name="Closing ratio"
            stroke={t.ratio}
            strokeWidth={2}
            dot={{ r: 2.5, fill: t.ratio }}
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
  const t = useChartTheme();
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
              <Cell key={entry.name} fill={t.palette[index % t.palette.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={t.tooltipStyle} labelStyle={t.tooltipLabelStyle} itemStyle={t.tooltipItemStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RankedBars({
  data,
  height = 240,
  color = "var(--color-foreground)",
}: {
  data: { name: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const t = useChartTheme();
  return (
    <div className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
        >
          <CartesianGrid stroke={t.grid} horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 10, fill: t.axis }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 10, fill: t.axis }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={t.tooltipStyle} labelStyle={t.tooltipLabelStyle} itemStyle={t.tooltipItemStyle} />
          <Bar dataKey="value" name="Count" fill={color} radius={[0, 4, 4, 0]} maxBarSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
