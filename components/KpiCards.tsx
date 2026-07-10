import type { NioStatRow } from "@/types/stats";
import { formatTagLabel } from "@/lib/filterNioTags";

type KpiCardsProps = {
  rows: NioStatRow[];
};

function topByTotal(rows: NioStatRow[], key: "tag" | "channel"): { name: string; total: number } | null {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row[key], (totals.get(row[key]) ?? 0) + row.total);
  }
  let best: { name: string; total: number } | null = null;
  for (const [name, total] of totals) {
    if (!best || total > best.total) best = { name, total };
  }
  return best;
}

export function KpiCards({ rows }: KpiCardsProps) {
  const totalAtendimentos = rows.reduce((sum, row) => sum + row.total, 0);
  const topChannel = topByTotal(rows, "channel");
  const topTag = topByTotal(rows, "tag");
  const activeTags = new Set(rows.map((row) => row.tag)).size;

  const cards = [
    { label: "Total de atendimentos", value: totalAtendimentos.toLocaleString("pt-BR") },
    { label: "Canal com maior volume", value: topChannel?.name ?? "—" },
    { label: "Classificação com maior volume", value: topTag ? formatTagLabel(topTag.name) : "—" },
    { label: "Classificações ativas", value: String(activeTags) },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="card p-5 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 brand-gradient" />
          <p className="text-xs uppercase tracking-wide text-text-muted mb-2">{card.label}</p>
          <p className="text-2xl font-semibold truncate" title={card.value}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
