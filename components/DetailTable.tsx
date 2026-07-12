"use client";

import { useMemo, useState } from "react";
import type { NioStatRow } from "@/types/stats";
import { formatTagLabel } from "@/lib/filterNioTags";

type DetailTableProps = {
  rows: NioStatRow[];
};

type SortKey = "tag" | "channel" | "total";

function toCsv(rows: NioStatRow[]): string {
  const header = "classificacao,canal,total,percentual";
  const lines = rows.map(
    (row) => `"${formatTagLabel(row.tag)}","${row.channel}",${row.total},${row.percentage}`,
  );
  return [header, ...lines].join("\n");
}

export function DetailTable({ rows }: DetailTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortAsc ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortAsc]);

  function sortBy(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function exportCsv() {
    const blob = new Blob([toCsv(sorted)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    a.download = `nio-atendimentos-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "tag", label: "Classificação" },
    { key: "channel", label: "Canal" },
    { key: "total", label: "Total" },
  ];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-muted">Detalhamento</h3>
        <button
          type="button"
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-brand-green/60 text-text-muted hover:text-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Exportar CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b border-border">
              {columns.map((col) => (
                <th key={col.key} className="pb-2 pr-4">
                  <button
                    type="button"
                    onClick={() => sortBy(col.key)}
                    className="hover:text-text transition-colors font-medium"
                  >
                    {col.label} {sortKey === col.key ? (sortAsc ? "▲" : "▼") : ""}
                  </button>
                </th>
              ))}
              <th className="pb-2">%</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={`${row.tag}|||${row.channel}`} className="border-b border-border/50">
                <td className="py-2 pr-4">{formatTagLabel(row.tag)}</td>
                <td className="py-2 pr-4">{row.channel}</td>
                <td className="py-2 pr-4">{row.total.toLocaleString("pt-BR")}</td>
                <td className="py-2 text-text-muted">{row.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
