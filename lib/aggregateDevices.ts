import { fetchDeviceSearchPage, fetchDeviceSearchPageByStatus } from "@/lib/flashmanApi";
import { isIgnoredVendor } from "@/lib/deviceFilters";
import type { DeviceProjection, NamedCount } from "@/types/devices";

/** Não dispara todas as ~397 páginas de uma vez — evita sobrecarregar o Flashman. */
const CONCURRENCY = 25;

export async function fetchAllDeviceProjections(): Promise<DeviceProjection[]> {
  const first = await fetchDeviceSearchPage(1);
  const all: DeviceProjection[] = [...first.devices];
  const totalPages = first.totalPages;

  let nextPage = 2;
  async function worker() {
    while (nextPage <= totalPages) {
      const page = nextPage;
      nextPage += 1;
      const result = await fetchDeviceSearchPage(page);
      all.push(...result.devices);
    }
  }

  const workerCount = Math.min(CONCURRENCY, Math.max(totalPages - 1, 0));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return all;
}

/**
 * Lista completa de dispositivos offline/instáveis (não só a contagem) —
 * usada pelos cards clicáveis do HC. Contagens bem menores que a base
 * inteira (centenas, não ~20 mil), então poucas páginas mesmo buscando tudo.
 */
export async function fetchAllDevicesByStatus(status: "offline" | "unstable"): Promise<DeviceProjection[]> {
  const first = await fetchDeviceSearchPageByStatus(status, 1);
  const all: DeviceProjection[] = [...first.devices];
  const totalPages = first.totalPages;

  let nextPage = 2;
  async function worker() {
    while (nextPage <= totalPages) {
      const page = nextPage;
      nextPage += 1;
      const result = await fetchDeviceSearchPageByStatus(status, page);
      all.push(...result.devices);
    }
  }

  const workerCount = Math.min(CONCURRENCY, Math.max(totalPages - 1, 0));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return all;
}

/**
 * Mesma regra de escopo usada em aggregateDevices: com lista de inclusão
 * ativa, só o que está nela; senão, base inteira menos fabricantes ignorados.
 */
export function filterToCurrentScope(
  devices: DeviceProjection[],
  trackedSerials?: Set<string>,
): DeviceProjection[] {
  return trackedSerials
    ? devices.filter((device) => device.serial_tr069 != null && trackedSerials.has(device.serial_tr069.toUpperCase()))
    : devices.filter((device) => !isIgnoredVendor(device.vendor));
}

export type DeviceAggregation = {
  averages: { rxPower: number | null; txPower: number | null };
  distribution: {
    vendor: NamedCount[];
    model: NamedCount[];
    firmware: NamedCount[];
  };
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10;
}

function countBy(devices: DeviceProjection[], key: "vendor" | "model" | "installed_release"): NamedCount[] {
  const counts = new Map<string, number>();
  for (const device of devices) {
    const value = device[key];
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Médias ignoram dispositivos sem RX/TX (tipicamente equipamentos sem PON).
 *
 * Sem `trackedSerials` (modo "base inteira"): descarta fabricantes ignorados
 * (lib/deviceFilters.ts) antes de calcular.
 * Com `trackedSerials` (modo "lista de inclusão"): descarta tudo que não
 * estiver na lista — a lista já define o universo, fabricante ignorado não
 * entra em jogo.
 */
export function aggregateDevices(devices: DeviceProjection[], trackedSerials?: Set<string>): DeviceAggregation {
  const relevant = filterToCurrentScope(devices, trackedSerials);

  const rxValues = relevant
    .map((device) => device.pon_rxpower)
    .filter((value): value is number => typeof value === "number");
  const txValues = relevant
    .map((device) => device.pon_txpower)
    .filter((value): value is number => typeof value === "number");

  return {
    averages: {
      rxPower: average(rxValues),
      txPower: average(txValues),
    },
    distribution: {
      vendor: countBy(relevant, "vendor"),
      model: countBy(relevant, "model"),
      firmware: countBy(relevant, "installed_release"),
    },
  };
}
