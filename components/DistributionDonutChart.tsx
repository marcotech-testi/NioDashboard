"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { NamedCount } from "@/types/devices";
import { colorForKey } from "@/lib/chartColors";

type DistributionDonutChartProps = {
  title: string;
  data: NamedCount[];
};

export function DistributionDonutChart({ title, data }: DistributionDonutChartProps) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-medium text-text-muted mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={360}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="name" innerRadius={80} outerRadius={130} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={colorForKey(entry.name)} stroke="#0c0f0d" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#181c19", border: "1px solid #2a2f2a", borderRadius: 8 }}
            labelStyle={{ color: "#f4f6f4" }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
