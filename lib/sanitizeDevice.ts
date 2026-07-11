import type { DeviceDetail, DeviceWanDetail, DeviceWifiDetail } from "@/types/devices";

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function bool(value: unknown): boolean {
  return value === true;
}

function wifiBandLabel(type: unknown): string {
  if (type === 5) return "5GHz";
  if (type === 2) return "2.4GHz";
  return "desconhecida";
}

function sanitizeWans(raw: unknown): DeviceWanDetail[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((wan) => {
    const w = wan as Record<string, unknown>;
    const ipv4 = w.ipv4 as Record<string, unknown> | undefined;
    return {
      connectionType: str(w.connection_type) ?? "desconhecido",
      status: str(w.status) ?? "desconhecido",
      ipv4: str(ipv4?.ip),
    };
  });
}

function sanitizeWifi(raw: unknown): DeviceWifiDetail[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((wifi) => {
    const w = wifi as Record<string, unknown>;
    return {
      ssid: str(w.ssid) ?? "",
      band: wifiBandLabel(w.type),
      channel: str(w.channel) ?? "auto",
      status: str(w.status) ?? "desconhecido",
    };
  });
}

/**
 * Allowlist explícito do que pode chegar ao front. O documento bruto da API
 * inclui senha de Wi-Fi, senha de admin, senha PPPoE e outras credenciais —
 * nada além do que está mapeado aqui deve ser exposto.
 */
export function sanitizeDevice(raw: Record<string, unknown>): DeviceDetail {
  const externalReference = raw.external_reference as Record<string, unknown> | undefined;

  return {
    serialTr069: str(raw.serial_tr069) ?? "",
    mac: str(raw._id) ?? "",
    vendor: str(raw.vendor) ?? "",
    model: str(raw.model) ?? "",
    installedRelease: str(raw.installed_release) ?? "",
    online: bool(raw.online_status),
    unstableConnection: bool(raw.unstable_connection),
    lastContact: str(raw.last_contact),
    sysUpTimeSeconds: num(raw.sys_up_time),
    ponRxPower: num(raw.pon_rxpower),
    ponTxPower: num(raw.pon_txpower),
    ponTemperature: num(raw.pon_temperature),
    contractReference: str(externalReference?.data),
    wans: sanitizeWans(raw.wans),
    wifi: sanitizeWifi(raw.wifi),
  };
}
