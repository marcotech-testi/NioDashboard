import type { RawStatRow } from "@/types/stats";

const GROUPER_ONE = "tag";
const GROUPER_TWO = "canal";
/** A API sempre respondeu com apenas 1 dia de dado real independente do range
 * pedido; o parâmetro que efetivamente controla a janela é `period` (ver
 * lib/dateRules.ts). Aqui cada chamada busca sempre um único dia. */
const SINGLE_DAY_PERIOD = 1;

export class StatsApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StatsApiError";
    this.status = status;
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value;
}

export async function fetchStatsForDate(date: string): Promise<RawStatRow[]> {
  const baseUrl = requireEnv("STATS_API_BASE_URL");
  const token = requireEnv("STATS_API_TOKEN");

  const url = new URL("/getstatisticstags", baseUrl);
  url.searchParams.set("initialDate", date);
  url.searchParams.set("finalDate", date);
  url.searchParams.set("grouperOne", GROUPER_ONE);
  url.searchParams.set("grouperTwo", GROUPER_TWO);
  url.searchParams.set("period", String(SINGLE_DAY_PERIOD));
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
