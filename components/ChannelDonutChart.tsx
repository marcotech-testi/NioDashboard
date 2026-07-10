"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { NioStatRow } from "@/types/stats";
import { colorForKey } from "@/lib/chartColors";

type ChannelDonutChartProps = {
  rows: NioStatRow[];
};

export function ChannelDonutChart({ rows }: ChannelDonutChartProps) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.channel, (totals.get(row.channel) ?? 0) + row.total);
  }
  const data = Array.from(totals.entries()).map(([channel, total]) => ({ channel, total }));

  return (
    <div className="card p-5">
      <h3 className="text-sm font-medium text-text-muted mb-4">Distribuição percentual por canal</h3>
      <ResponsiveContainer width="100%" height={360}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="channel"
            innerRadius={80}
            outerRadius={130}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.channel} fill={colorForKey(entry.channel)} stroke="#0a0a0c" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#16171c", border: "1px solid #26272f", borderRadius: 8 }}
            labelStyle={{ color: "#f3f4f7" }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
