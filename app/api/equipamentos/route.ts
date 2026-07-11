import { NextRequest, NextResponse } from "next/server";
import { FlashmanApiError, fetchConnectionStatus } from "@/lib/flashmanApi";
import { aggregateDevices, fetchAllDeviceProjections } from "@/lib/aggregateDevices";
import { getEquipmentsSummary } from "@/lib/equipmentsCache";
import { IGNORED_VENDORS } from "@/lib/deviceFilters";
import type { ConnectionStatusCounts, EquipmentsSummary } from "@/types/devices";

function subtractCounts(a: ConnectionStatusCounts, b: ConnectionStatusCounts): ConnectionStatusCounts {
  return {
    totalCount: a.totalCount - b.totalCount,
    onlineCount: a.onlineCount - b.onlineCount,
    unstableCount: a.unstableCount - b.unstableCount,
    offlineCount: a.offlineCount - b.offlineCount,
  };
}

async function computeEquipmentsSummary(): Promise<EquipmentsSummary> {
  const [total, good, weak, bad, noSignal, ignoredTotal, ignoredGood, ignoredWeak, ignoredBad, ignoredNoSignal, devices] =
    await Promise.all([
      fetchConnectionStatus(),
      fetchConnectionStatus("good"),
      fetchConnectionStatus("weak"),
      fetchConnectionStatus("bad"),
      fetchConnectionStatus("noSignal"),
      fetchConnectionStatus(undefined, IGNORED_VENDORS),
      fetchConnectionStatus("good", IGNORED_VENDORS),
      fetchConnectionStatus("weak", IGNORED_VENDORS),
      fetchConnectionStatus("bad", IGNORED_VENDORS),
      fetchConnectionStatus("noSignal", IGNORED_VENDORS),
      fetchAllDeviceProjections(),
    ]);

  const adjustedTotal = subtractCounts(total, ignoredTotal);
  const adjustedGood = subtractCounts(good, ignoredGood);
  const adjustedWeak = subtractCounts(weak, ignoredWeak);
  const adjustedBad = subtractCounts(bad, ignoredBad);
  const adjustedNoSignal = subtractCounts(noSignal, ignoredNoSignal);

  const aggregation = aggregateDevices(devices);

  return {
    fetchedAt: new Date().toISOString(),
    counts: {
      total: adjustedTotal.totalCount,
      online: adjustedTotal.onlineCount,
      offline: adjustedTotal.offlineCount,
      unstable: adjustedTotal.unstableCount,
    },
    signal: {
      good: adjustedGood.totalCount,
      weak: adjustedWeak.totalCount,
      bad: adjustedBad.totalCount,
      noSignal: adjustedNoSignal.totalCount,
    },
    averages: aggregation.averages,
    distribution: aggregation.distribution,
    scannedDevices: devices.length,
  };
}

/**
 * Proxy server-side para a API do Flashman. A base (~19.800 dispositivos)
 * não cabe em uma única chamada (máx. 50/página); combinamos contagens
 * agregadas (leves, já descontando os fabricantes ignorados em
 * lib/deviceFilters.ts) com uma varredura paginada projetada só para o que
 * os KPIs de distribuição/média precisam.
 *
 * Cache stale-while-revalidate (lib/equipmentsCache.ts): fora de
 * `?force=true`, nenhuma requisição espera a sincronização completa —
 * recebe o último snapshot na hora enquanto uma atualização roda em
 * background quando o cache de 5min expira.
 */
export async function GET(request: NextRequest) {
  const force = request.nextUrl.searchParams.get("force") === "true";

  try {
    const summary = await getEquipmentsSummary(computeEquipmentsSummary, force);
    return NextResponse.json(summary);
  } catch (error) {
    const status = error instanceof FlashmanApiError ? 502 : 500;
    const message = error instanceof Error ? error.message : "Erro desconhecido ao consultar equipamentos.";
    return NextResponse.json({ error: message }, { status });
  }
}
