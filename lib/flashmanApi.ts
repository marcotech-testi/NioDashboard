import { requireEnv } from "@/lib/env";
import type { ConnectionStatusCounts, DeviceSearchPage, SignalQuality } from "@/types/devices";

const SEARCH_FIELDS = "vendor;model;installed_release;pon_rxpower;pon_txpower";
const PAGE_LIMIT = 50;

export class FlashmanApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "FlashmanApiError";
    this.status = status;
  }
}

function authHeader(): string {
  const user = requireEnv("FLASHMAN_USER");
  const password = requireEnv("FLASHMAN_PASSWORD");
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

/** Uma sincronização faz ~400 chamadas; blips de rede transitórios em uma
 * única página não devem derrubar a sincronização inteira. */
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sempre `no-store`: o cache/staleness deste dashboard é controlado em
 * lib/equipmentsCache.ts (stale-while-revalidate em memória), não pelo
 * fetch cache do Next.js — evita duas camadas de cache com semânticas
 * diferentes brigando entre si.
 */
async function flashmanFetch(path: string, searchParams: URLSearchParams): Promise<Response> {
  const url = new URL(path, requireEnv("FLASHMAN_URL"));
  url.search = searchParams.toString();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: authHeader() },
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new FlashmanApiError(
          `Falha ao consultar API Flashman (${res.status}): ${body || res.statusText}`,
          res.status,
        );
      }

      return res;
    } catch (error) {
      // Erros HTTP (4xx/5xx) não são transitórios — não vale a pena repetir.
      const isRetriable = !(error instanceof FlashmanApiError);
      if (!isRetriable || attempt === MAX_ATTEMPTS) throw error;
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  throw new Error("unreachable");
}

/**
 * Contagens já agregadas pelo Flashman — não requer baixar dispositivo por
 * dispositivo. Sem `signal`, retorna online/offline/instável/total gerais;
 * com `signal`, filtra por classificação de sinal (`good`/`weak`/`bad`/`noSignal`).
 * `vendors`, quando informado, restringe a contagem a esses fabricantes —
 * usado para descontar fabricantes ignorados (ver lib/deviceFilters.ts).
 */
export async function fetchConnectionStatus(
  signal?: SignalQuality,
  vendors?: string[],
): Promise<ConnectionStatusCounts> {
  const params = new URLSearchParams();
  if (signal) params.set("ponRxPower", signal);
  for (const vendor of vendors ?? []) params.append("vendor", vendor);

  const res = await flashmanFetch("/api/v3/device/connection-status/v2", params);
  const data = await res.json();
  return {
    totalCount: data.totalCount ?? 0,
    onlineCount: data.onlineCount ?? 0,
    unstableCount: data.unstableCount ?? 0,
    offlineCount: data.offlineCount ?? 0,
  };
}

/** Uma página (máx. 50 dispositivos) da busca, com projeção de campos para reduzir payload. */
export async function fetchDeviceSearchPage(page: number): Promise<DeviceSearchPage> {
  const params = new URLSearchParams({
    fields: SEARCH_FIELDS,
    page: String(page),
    pageLimit: String(PAGE_LIMIT),
  });
  const res = await flashmanFetch("/api/v3/device/search/", params);
  return (await res.json()) as DeviceSearchPage;
}
