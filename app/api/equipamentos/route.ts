import { NextRequest, NextResponse } from "next/server";
import { FlashmanApiError, fetchConnectionStatus } from "@/lib/flashmanApi";
import {
  aggregateDevices,
  fetchAllDeviceProjections,
  fetchTrackedDeviceProjections,
} from "@/lib/aggregateDevices";
import { getEquipmentsSummary } from "@/lib/equipmentsCache";
import { hasTrackedSerialsList, IGNORED_VENDORS, TRACKED_SERIALS } from "@/lib/deviceFilters";
import type { ConnectionStatusCounts, DeviceProjection, EquipmentsSummary } from "@/types/devices";

function subtractCounts(a: ConnectionStatusCounts, b: ConnectionStatusCounts): ConnectionStatusCounts {
  return {
    totalCount: a.totalCount - b.totalCount,
    onlineCount: a.onlineCount - b.onlineCount,
    unstableCount: a.unstableCount - b.unstableCount,
    offlineCount: a.offlineCount - b.offlineCount,
  };
}

function summaryFromCounts(
  counts: {
    total: ConnectionStatusCounts;
    good: ConnectionStatusCounts;
    weak: ConnectionStatusCounts;
    bad: ConnectionStatusCounts;
    noSignal: ConnectionStatusCounts;
  },
  devices: DeviceProjection[],
): EquipmentsSummary {
  const aggregation = aggregateDevices(devices);
  return {
    fetchedAt: new Date().toISOString(),
    counts: {
      total: counts.total.totalCount,
      online: counts.total.onlineCount,
      offline: counts.total.offlineCount,
      unstable: counts.total.unstableCount,
    },
    signal: {
      good: counts.good.totalCount,
      weak: counts.weak.totalCount,
      bad: counts.bad.totalCount,
      noSignal: counts.noSignal.totalCount,
    },
    averages: aggregation.averages,
    distribution: aggregation.distribution,
    scannedDevices: devices.length,
  };
}

/** Base inteira menos os fabricantes ignorados (lib/deviceFilters.ts). */
async function computeFromFullFleet(): Promise<EquipmentsSummary> {
  const [total, good, weak, bad, noSignal, ignoredTotal, ignoredGood, ignoredWeak, ignoredBad, ignoredNoSignal, devices] =
    await Promise.all([
      fetchConnectionStatus(),
      fetchConnectionStatus("good"),
      fetchConnectionStatus("weak"),
      fetchConnectionStatus("bad"),
      fetchConnectionStatus("noSignal"),
      fetchConnectionStatus(undefined, { vendors: IGNORED_VENDORS }),
      fetchConnectionStatus("good", { vendors: IGNORED_VENDORS }),
      fetchConnectionStatus("weak", { vendors: IGNORED_VENDORS }),
      fetchConnectionStatus("bad", { vendors: IGNORED_VENDORS }),
      fetchConnectionStatus("noSignal", { vendors: IGNORED_VENDORS }),
      fetchAllDeviceProjections(),
    ]);

  return summaryFromCounts(
    {
      total: subtractCounts(total, ignoredTotal),
      good: subtractCounts(good, ignoredGood),
      weak: subtractCounts(weak, ignoredWeak),
      bad: subtractCounts(bad, ignoredBad),
      noSignal: subtractCounts(noSignal, ignoredNoSignal),
    },
    devices,
  );
}

/** Só os dispositivos em TRACKED_SERIALS (lib/deviceFilters.ts) — lista de inclusão. */
async function computeFromTrackedSerials(): Promise<EquipmentsSummary> {
  const serials = { serials: TRACKED_SERIALS };
  const [total, good, weak, bad, noSignal, devices] = await Promise.all([
    fetchConnectionStatus(undefined, serials),
    fetchConnectionStatus("good", serials),
    fetchConnectionStatus("weak", serials),
    fetchConnectionStatus("bad", serials),
    fetchConnectionStatus("noSignal", serials),
    fetchTrackedDeviceProjections(TRACKED_SERIALS),
  ]);

  return summaryFromCounts({ total, good, weak, bad, noSignal }, devices);
}

function computeEquipmentsSummary(): Promise<EquipmentsSummary> {
  return hasTrackedSerialsList() ? computeFromTrackedSerials() : computeFromFullFleet();
}

/**
 * Proxy server-side para a API do Flashman. Dois modos, ver
 * lib/deviceFilters.ts:
 * - TRACKED_SERIALS vazia (padrão): varre a base inteira (~19.800
 *   dispositivos, não cabe em uma única chamada — máx. 50/página) menos os
 *   fabricantes ignorados.
 * - TRACKED_SERIALS preenchida: os indicadores passam a ser calculados só a
 *   partir desses seriais específicos, buscados um a um.
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
