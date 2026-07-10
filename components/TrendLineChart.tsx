"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/types/stats";

type TrendLineChartProps = {
  trend: TrendPoint[] | null;
};

export function TrendLineChart({ trend }: TrendLineChartProps) {
  if (!trend || trend.length <= 1) return null;

  return (
    <div className="card p-5">
      <h3 className="text-sm font-medium text-text-muted mb-4">Evolução temporal do volume total</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={trend} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34E37A" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#34E37A" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2f2a" />
          <XAxis dataKey="date" stroke="#97a098" fontSize={12} />
          <YAxis stroke="#97a098" fontSize={12} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "#181c19", border: "1px solid #2a2f2a", borderRadius: 8 }}
            labelStyle={{ color: "#f4f6f4" }}
          />
          <Area type="monotone" dataKey="total" stroke="#34E37A" fill="url(#trendFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
