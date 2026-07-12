import type { RawStatRow } from "@/types/stats";
import { requireEnv } from "@/lib/env";

const GROUPER_ONE = "tag";
const GROUPER_TWO = "canal";

export class StatsApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StatsApiError";
    this.status = status;
  }
}

/**
 * Nunca manda `period` — testado ao vivo, esse parâmetro sequestra o filtro
 * de data (`period=1` sempre devolve vazio; `period>=3` sempre devolve o
 * acumulado inteiro desde o início do histórico, ignorando initialDate/
 * finalDate). Sem `period`, initialDate=finalDate=date filtra corretamente
 * só aquele dia (ver lib/dateRules.ts).
 */
export async function fetchStatsForDate(date: string): Promise<RawStatRow[]> {
  const baseUrl = requireEnv("STATS_API_BASE_URL");
  const token = requireEnv("STATS_API_TOKEN");

  const url = new URL("/getstatisticstags", baseUrl);
  url.searchParams.set("initialDate", date);
  url.searchParams.set("finalDate", date);
  url.searchParams.set("grouperOne", GROUPER_ONE);
  url.searchParams.set("grouperTwo", GROUPER_TWO);
  url.searchParams.set("token", token);

  const res = await fetch(url, { next: { revalidate: 60 } });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new StatsApiError(
      `Falha ao consultar API de estatísticas (${res.status}): ${body || res.statusText}`,
      res.status,
    );
  }

  const data = (await res.json()) as RawStatRow[];
  return Array.isArray(data) ? data : [];
}
