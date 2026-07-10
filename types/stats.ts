/**
 * Shape real confirmado chamando a API em produção (não o assumido no PRD original):
 * GET /getstatisticstags retorna um array plano, sem envelope `{ data: [...] }`.
 */
export type RawStatRow = {
  agrupador_1: string;
  agrupador_2: string;
  num_qtd: string;
  num_porcentagem: number;
};

export type PeriodPreset = 1 | 7 | 30;

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 1, label: "Hoje" },
  { value: 7, label: "Últimos 7 dias" },
  { value: 30, label: "Este mês" },
];

/** Linha já filtrada por prefixo NIO, com total numérico e percentual recalculado sobre o subconjunto NIO. */
export type NioStatRow = {
  tag: string;
  channel: string;
  total: number;
  percentage: number;
};

export type TrendPoint = {
  date: string;
  total: number;
};

export type StatsResponse = {
  period: PeriodPreset;
  finalDate: string;
  minDate: string;
  rows: NioStatRow[];
  trend: TrendPoint[] | null;
};

export type StatsErrorResponse = {
  error: string;
};
