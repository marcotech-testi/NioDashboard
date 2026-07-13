type StatCard = {
  label: string;
  value: string;
  /** Texto do tooltip explicando o KPI (ex.: range de dBm). Sem isso, sem ícone de info. */
  description?: string;
  /** Torna o card clicável (ex.: abrir lista de dispositivos afetados). */
  onClick?: () => void;
};

type StatCardGridProps = {
  cards: StatCard[];
};

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-11.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM9 9a.75.75 0 000 1.5h.25v3.25a.75.75 0 001.5 0V9.75A.75.75 0 0010 9H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function StatCardGrid({ cards }: StatCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Wrapper = card.onClick ? "button" : "div";
        return (
          <Wrapper
            key={card.label}
            type={card.onClick ? "button" : undefined}
            onClick={card.onClick}
            className={
              "card p-5 relative text-left w-full" +
              (card.onClick ? " hover:border-brand-green/60 transition-colors cursor-pointer" : "")
            }
          >
            {/* overflow-hidden não pode ir no card: cortaria o tooltip, que
             * precisa extrapolar a largura do card para ser legível. */}
            <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl brand-gradient" />
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-xs uppercase tracking-wide text-text-muted">{card.label}</p>
              {card.description && (
                <span className="group relative inline-flex text-text-muted hover:text-brand-green">
                  <InfoIcon />
                  <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-56 -translate-x-1/2 rounded-lg border border-border bg-surface-hover p-2.5 text-xs font-normal normal-case leading-snug text-text shadow-xl group-hover:block">
                    {card.description}
                  </span>
                </span>
              )}
            </div>
            <p className="text-2xl font-semibold truncate" title={card.value}>
              {card.value}
            </p>
            {card.onClick && <p className="text-xs text-text-muted mt-1">Ver lista →</p>}
          </Wrapper>
        );
      })}
    </div>
  );
}
