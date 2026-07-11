import { NextRequest, NextResponse } from "next/server";
import { fetchConnectionStatus, FlashmanApiError } from "@/lib/flashmanApi";
import { aggregateDevices, fetchAllDeviceProjections } from "@/lib/aggregateDevices";
import { getEquipmentsSummary } from "@/lib/equipmentsCache";
import type { EquipmentsSummary } from "@/types/devices";

async function computeEquipmentsSummary(): Promise<EquipmentsSummary> {
  const [total, good, weak, bad, noSignal, devices] = await Promise.all([
    fetchConnectionStatus(),
    fetchConnectionStatus("good"),
    fetchConnectionStatus("weak"),
    fetchConnectionStatus("bad"),
    fetchConnectionStatus("noSignal"),
    fetchAllDeviceProjections(),
  ]);

  const aggregation = aggregateDevices(devices);

  return {
    fetchedAt: new Date().toISOString(),
    counts: {
      total: total.totalCount,
      online: total.onlineCount,
      offline: total.offlineCount,
      unstable: total.unstableCount,
    },
    signal: {
      good: good.totalCount,
      weak: weak.totalCount,
      bad: bad.totalCount,
      noSignal: noSignal.totalCount,
    },
    averages: aggregation.averages,
    distribution: aggregation.distribution,
    scannedDevices: devices.length,
  };
}

/**
 * Proxy server-side para a API do Flashman. A base (~19.800 dispositivos)
 * não cabe em uma única chamada (máx. 50/página); combinamos contagens
 * agregadas (leves) com uma varredura paginada projetada só para o que os
 * KPIs de distribuição/média precisam.
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
