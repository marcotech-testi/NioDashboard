import { fetchDeviceBySerial, fetchDeviceSearchPage } from "@/lib/flashmanApi";
import { isIgnoredVendor } from "@/lib/deviceFilters";
import type { DeviceProjection, NamedCount } from "@/types/devices";

/** Não dispara todas as ~397 páginas (ou todos os seriais) de uma vez — evita
 * sobrecarregar o Flashman. */
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

function toProjection(raw: Record<string, unknown>): DeviceProjection {
  return {
    _id: String(raw._id ?? ""),
    vendor: typeof raw.vendor === "string" ? raw.vendor : undefined,
    model: typeof raw.model === "string" ? raw.model : undefined,
    installed_release: typeof raw.installed_release === "string" ? raw.installed_release : undefined,
    pon_rxpower: typeof raw.pon_rxpower === "number" ? raw.pon_rxpower : undefined,
    pon_txpower: typeof raw.pon_txpower === "number" ? raw.pon_txpower : undefined,
    serial_tr069: typeof raw.serial_tr069 === "string" ? raw.serial_tr069 : undefined,
  };
}

/**
 * Modo "lista de inclusão" (TRACKED_SERIALS): busca cada serial
 * individualmente em vez de varrer a base inteira — muito mais direto
 * quando a lista é pequena/média frente aos ~19.800 dispositivos totais.
 * Seriais não encontrados são silenciosamente ignorados.
 */
export async function fetchTrackedDeviceProjections(serials: string[]): Promise<DeviceProjection[]> {
  const found: DeviceProjection[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < serials.length) {
      const index = nextIndex;
      nextIndex += 1;
      const raw = await fetchDeviceBySerial(serials[index]);
      if (raw) found.push(toProjection(raw));
    }
  }

  const workerCount = Math.min(CONCURRENCY, serials.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return found;
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
 * Fabricantes ignorados (lib/deviceFilters.ts) são descartados antes de
 * qualquer cálculo, então não aparecem em médias nem em distribuições.
 */
export function aggregateDevices(devices: DeviceProjection[]): DeviceAggregation {
  const relevant = devices.filter((device) => !isIgnoredVendor(device.vendor));

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
