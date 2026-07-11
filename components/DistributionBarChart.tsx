"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { NamedCount } from "@/types/devices";
import { colorForKey } from "@/lib/chartColors";

type DistributionBarChartProps = {
  title: string;
  data: NamedCount[];
  /** Já vem ordenado por count desc do backend; corta para o gráfico não ficar ilegível. */
  maxItems?: number;
};

export function DistributionBarChart({ title, data, maxItems = 15 }: DistributionBarChartProps) {
  const shown = data.slice(0, maxItems);
  const omitted = data.length - shown.length;

  return (
    <div className="card p-5">
      <h3 className="text-sm font-medium text-text-muted mb-1">{title}</h3>
      {omitted > 0 && (
        <p className="text-xs text-text-muted mb-3">
          Mostrando os {maxItems} mais frequentes ({omitted} não exibidos).
        </p>
      )}
      <ResponsiveContainer width="100%" height={Math.max(240, shown.length * 32)}>
        <BarChart data={shown} layout="vertical" margin={{ left: 24, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2f2a" horizontal={false} />
          <XAxis type="number" stroke="#97a098" fontSize={12} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#97a098"
            fontSize={11}
            width={160}
            tick={{ fill: "#97a098" }}
          />
          <Tooltip
            contentStyle={{ background: "#181c19", border: "1px solid #2a2f2a", borderRadius: 8 }}
            labelStyle={{ color: "#f4f6f4" }}
          />
          <Bar dataKey="count">
            {shown.map((entry) => (
              <Cell key={entry.name} fill={colorForKey(entry.name)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
