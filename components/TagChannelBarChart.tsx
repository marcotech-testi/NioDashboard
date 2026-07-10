"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NioStatRow } from "@/types/stats";
import { colorForKey } from "@/lib/chartColors";

type TagChannelBarChartProps = {
  rows: NioStatRow[];
};

export function TagChannelBarChart({ rows }: TagChannelBarChartProps) {
  const channels = Array.from(new Set(rows.map((row) => row.channel))).sort();

  const byTag = new Map<string, Record<string, number | string>>();
  for (const row of rows) {
    const entry = byTag.get(row.tag) ?? { tag: row.tag };
    entry[row.channel] = (Number(entry[row.channel]) || 0) + row.total;
    byTag.set(row.tag, entry);
  }

  const data = Array.from(byTag.values())
    .map((entry) => ({
      ...entry,
      __total: channels.reduce((sum, ch) => sum + (Number(entry[ch]) || 0), 0),
    }))
    .sort((a, b) => (b.__total as number) - (a.__total as number))
    .slice(0, 15);

  return (
    <div className="card p-5">
      <h3 className="text-sm font-medium text-text-muted mb-4">Volume por tag, com breakdown por canal</h3>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2f2a" horizontal={false} />
          <XAxis type="number" stroke="#97a098" fontSize={12} />
          <YAxis
            type="category"
            dataKey="tag"
            stroke="#97a098"
            fontSize={11}
            width={160}
            tick={{ fill: "#97a098" }}
          />
          <Tooltip
            contentStyle={{ background: "#181c19", border: "1px solid #2a2f2a", borderRadius: 8 }}
            labelStyle={{ color: "#f4f6f4" }}
          />
          <Legend />
          {channels.map((channel) => (
            <Bar key={channel} dataKey={channel} stackId="channel" fill={colorForKey(channel)} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
