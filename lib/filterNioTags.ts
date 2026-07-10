import type { NioStatRow, RawStatRow } from "@/types/stats";

/**
 * A API mistura tags de todos os clientes/contextos do Hub MatrixDoBrasil.
 * Os dados da NIO são identificados por tags que começam com este prefixo.
 * Mantido como constante isolada para reuso caso outro cliente peça um
 * dashboard equivalente no futuro.
 */
export const TAG_PREFIX = "NIO";

/**
 * Filtra as linhas cujo `agrupador_1` começa com TAG_PREFIX (case-insensitive,
 * preservando o valor original para exibição), soma duplicatas de tag+canal
 * (o array de entrada pode conter uma chamada por dia do período) e recalcula
 * o percentual sobre o subconjunto NIO — `num_porcentagem` da API é relativo
 * ao total geral de todos os clientes, não serve para os KPIs da NIO.
 */
export function normalizeNioRows(raw: RawStatRow[]): NioStatRow[] {
  const merged = new Map<string, { tag: string; channel: string; total: number }>();

  for (const row of raw) {
    if (!row.agrupador_1.toUpperCase().startsWith(TAG_PREFIX)) continue;

    const key = `${row.agrupador_1}|||${row.agrupador_2}`;
    const total = Number(row.num_qtd) || 0;
    const existing = merged.get(key);
    if (existing) {
      existing.total += total;
    } else {
      merged.set(key, { tag: row.agrupador_1, channel: row.agrupador_2, total });
    }
  }

  const rows = Array.from(merged.values());
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

  return rows.map((row) => ({
    ...row,
    percentage: grandTotal > 0 ? Math.round((row.total / grandTotal) * 1000) / 10 : 0,
  }));
}

/**
 * Recalcula `percentage` sobre o total do próprio array recebido — usado no
 * cliente depois que os filtros de canal/tag reduzem o conjunto exibido, para
 * que os percentuais da tabela/KPIs somem 100% dentro do que está visível.
 */
export function recomputePercentages(rows: NioStatRow[]): NioStatRow[] {
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);
  return rows.map((row) => ({
    ...row,
    percentage: grandTotal > 0 ? Math.round((row.total / grandTotal) * 1000) / 10 : 0,
  }));
}

/** Total agregado de atendimentos NIO (soma de todas as tags/canais) em um conjunto de linhas cru. */
export function nioGrandTotal(raw: RawStatRow[]): number {
  return raw
    .filter((row) => row.agrupador_1.toUpperCase().startsWith(TAG_PREFIX))
    .reduce((sum, row) => sum + (Number(row.num_qtd) || 0), 0);
}
