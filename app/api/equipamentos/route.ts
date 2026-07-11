import { NextRequest, NextResponse } from "next/server";
import { fetchConnectionStatus, FlashmanApiError } from "@/lib/flashmanApi";
import { aggregateDevices, fetchAllDeviceProjections } from "@/lib/aggregateDevices";
import type { EquipmentsSummary } from "@/types/devices";

/**
 * Proxy server-side para a API do Flashman. A base (~19.800 dispositivos)
 * não cabe em uma única chamada (máx. 50/página); combinamos contagens
 * agregadas (leves) com uma varredura paginada projetada só para o que os
 * KPIs de distribuição/média precisam. Tudo cacheado 5min pelo fetch cache
 * do Next.js (ver lib/flashmanApi.ts); `?force=true` ignora o cache.
 */
export async function GET(request: NextRequest) {
  const force = request.nextUrl.searchParams.get("force") === "true";

  try {
    const [total, good, weak, bad, noSignal, devices] = await Promise.all([
      fetchConnectionStatus(undefined, force),
      fetchConnectionStatus("good", force),
      fetchConnectionStatus("weak", force),
      fetchConnectionStatus("bad", force),
      fetchConnectionStatus("noSignal", force),
      fetchAllDeviceProjections(force),
    ]);

    const aggregation = aggregateDevices(devices);

    const summary: EquipmentsSummary = {
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

    return NextResponse.json(summary);
  } catch (error) {
    const status = error instanceof FlashmanApiError ? 502 : 500;
    const message = error instanceof Error ? error.message : "Erro desconhecido ao consultar equipamentos.";
    return NextResponse.json({ error: message }, { status });
  }
}
