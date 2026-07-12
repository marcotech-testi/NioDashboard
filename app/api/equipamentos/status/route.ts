import { NextRequest, NextResponse } from "next/server";
import { FlashmanApiError } from "@/lib/flashmanApi";
import { fetchAllDevicesByStatus, filterToCurrentScope } from "@/lib/aggregateDevices";
import { getTrackedSerialsSet, hasTrackedSerialsList } from "@/lib/deviceFilters";

/**
 * Lista (não só contagem) de dispositivos offline/instáveis, pros cards
 * clicáveis do HC. Sem cache — consulta pontual sob demanda, não a
 * varredura pesada de /api/equipamentos. `offline`/`unstable` filtram
 * corretamente nesta API (diferente de `ponRxPower`/`externalReferenceData`,
 * testado ao vivo).
 */
export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");

  if (status !== "offline" && status !== "unstable") {
    return NextResponse.json({ error: "Parâmetro status inválido. Use offline ou unstable." }, { status: 400 });
  }

  try {
    const devices = await fetchAllDevicesByStatus(status);
    const trackedSet = hasTrackedSerialsList() ? getTrackedSerialsSet() : undefined;
    const scoped = filterToCurrentScope(devices, trackedSet);

    // Páginas buscadas em paralelo sobre dados que mudam ao vivo podem
    // repetir o mesmo dispositivo em duas páginas — dedupe por MAC (_id).
    const seen = new Set<string>();
    const deduped = scoped.filter((device) => {
      if (seen.has(device._id)) return false;
      seen.add(device._id);
      return true;
    });

    return NextResponse.json({
      status,
      devices: deduped.map((device) => ({
        serialTr069: device.serial_tr069 ?? null,
        vendor: device.vendor ?? null,
        model: device.model ?? null,
      })),
    });
  } catch (error) {
    const httpStatus = error instanceof FlashmanApiError ? 502 : 500;
    const message = error instanceof Error ? error.message : "Erro desconhecido ao consultar dispositivos.";
    return NextResponse.json({ error: message }, { status: httpStatus });
  }
}
