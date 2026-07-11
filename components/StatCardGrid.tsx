type StatCard = {
  label: string;
  value: string;
};

type StatCardGridProps = {
  cards: StatCard[];
};

export function StatCardGrid({ cards }: StatCardGridProps) {
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
