import { NextRequest, NextResponse } from "next/server";
import { FlashmanApiError, fetchConnectionStatus } from "@/lib/flashmanApi";
import { aggregateDevices, fetchAllDeviceProjections } from "@/lib/aggregateDevices";
import { getEquipmentsSummary } from "@/lib/equipmentsCache";
import { getTrackedSerialsSet, hasTrackedSerialsList, IGNORED_VENDORS } from "@/lib/deviceFilters";
import type { ConnectionStatusCounts, DeviceProjection, EquipmentsSummary, SignalQuality } from "@/types/devices";

/** Cada chamada de contagem filtrada por serial vira uma URL com N `serial=`;
 * mantido pequeno pra nunca esbarrar em limite de tamanho de URL. */
const SERIAL_CHUNK_SIZE = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function subtractCounts(a: ConnectionStatusCounts, b: ConnectionStatusCounts): ConnectionStatusCounts {
  return {
    totalCount: a.totalCount - b.totalCount,
    onlineCount: a.onlineCount - b.onlineCount,
    unstableCount: a.unstableCount - b.unstableCount,
    offlineCount: a.offlineCount - b.offlineCount,
  };
}

function sumCounts(items: ConnectionStatusCounts[]): ConnectionStatusCounts {
  return items.reduce(
    (acc, item) => ({
      totalCount: acc.totalCount + item.totalCount,
      onlineCount: acc.onlineCount + item.onlineCount,
      unstableCount: acc.unstableCount + item.unstableCount,
      offlineCount: acc.offlineCount + item.offlineCount,
    }),
    { totalCount: 0, onlineCount: 0, unstableCount: 0, offlineCount: 0 },
  );
}

/** Soma a contagem de um conjunto de seriais em lotes (a API não aceita uma
 * lista arbitrariamente grande em query string). */
async function fetchConnectionStatusForSerials(
  signal: SignalQuality | undefined,
  serials: string[],
): Promise<ConnectionStatusCounts> {
  if (serials.length === 0) return { totalCount: 0, onlineCount: 0, unstableCount: 0, offlineCount: 0 };
  const results = await Promise.all(
    chunk(serials, SERIAL_CHUNK_SIZE).map((batch) => fetchConnectionStatus(signal, { serials: batch })),
  );
  return sumCounts(results);
}

function summaryFromCounts(
  counts: {
    total: ConnectionStatusCounts;
    good: ConnectionStatusCounts;
    weak: ConnectionStatusCounts;
    bad: ConnectionStatusCounts;
    noSignal: ConnectionStatusCounts;
  },
  aggregation: ReturnType<typeof aggregateDevices>,
  scannedDevices: number,
): EquipmentsSummary {
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
    scannedDevices,
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
    aggregateDevices(devices),
    devices.length,
  );
}

function fleetSerials(devices: DeviceProjection[]): string[] {
  return devices
    .map((device) => device.serial_tr069)
    .filter((serial): serial is string => typeof serial === "string" && serial.length > 0)
    .map((serial) => serial.toUpperCase());
}

/**
 * Só os dispositivos em TRACKED_SERIALS (lib/deviceFilters.ts) — lista de
 * inclusão, tipicamente quase do tamanho da base inteira (~18 mil de ~19,8
 * mil). Reaproveita a MESMA varredura paginada do modo "base inteira" (é
 * onde os seriais de cada dispositivo aparecem) e filtra o resultado; para
 * as contagens agregadas, consulta em lotes só o lado MENOR — rastreados ou
 * excluídos, o que for menor — e deriva o outro por subtração do total
 * geral, em vez de sempre consultar os ~18 mil rastreados.
 */
async function computeFromTrackedSerials(): Promise<EquipmentsSummary> {
  const trackedSet = getTrackedSerialsSet();

  const [total, good, weak, bad, noSignal, devices] = await Promise.all([
    fetchConnectionStatus(),
    fetchConnectionStatus("good"),
    fetchConnectionStatus("weak"),
    fetchConnectionStatus("bad"),
    fetchConnectionStatus("noSignal"),
    fetchAllDeviceProjections(),
  ]);

  const serialsInFleet = fleetSerials(devices);
  const excluded = serialsInFleet.filter((serial) => !trackedSet.has(serial));
  const tracked = serialsInFleet.filter((serial) => trackedSet.has(serial));
  const useExcluded = excluded.length <= tracked.length;
  const querySerials = useExcluded ? excluded : tracked;

  const [sideTotal, sideGood, sideWeak, sideBad, sideNoSignal] = await Promise.all([
    fetchConnectionStatusForSerials(undefined, querySerials),
    fetchConnectionStatusForSerials("good", querySerials),
    fetchConnectionStatusForSerials("weak", querySerials),
    fetchConnectionStatusForSerials("bad", querySerials),
    fetchConnectionStatusForSerials("noSignal", querySerials),
  ]);

  const resolve = (full: ConnectionStatusCounts, side: ConnectionStatusCounts) =>
    useExcluded ? subtractCounts(full, side) : side;

  return summaryFromCounts(
    {
      total: resolve(total, sideTotal),
      good: resolve(good, sideGood),
      weak: resolve(weak, sideWeak),
      bad: resolve(bad, sideBad),
      noSignal: resolve(noSignal, sideNoSignal),
    },
    aggregateDevices(devices, trackedSet),
    devices.length,
  );
}

function computeEquipmentsSummary(): Promise<EquipmentsSummary> {
  return hasTrackedSerialsList() ? computeFromTrackedSerials() : computeFromFullFleet();
}

/**
 * Proxy server-side para a API do Flashman. Dois modos, ver
 * lib/deviceFilters.ts:
 * - Lista de inclusão vazia (padrão): varre a base inteira (~19.800
 *   dispositivos, não cabe em uma única chamada — máx. 50/página) menos os
 *   fabricantes ignorados.
 * - Lista de inclusão preenchida (data/tracked-serials.txt): os indicadores
 *   passam a ser calculados só a partir desses seriais específicos.
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
