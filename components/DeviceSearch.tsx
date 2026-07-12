"use client";

import { useState } from "react";
import type { DeviceDetail } from "@/types/devices";

function formatUptime(seconds: number | null): string {
  if (seconds === null) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function formatDbm(value: number | null): string {
  return value === null ? "—" : `${value.toLocaleString("pt-BR")} dBm`;
}

type SearchMode = "serial" | "contract";

const MODE_LABELS: Record<SearchMode, { label: string; placeholder: string; param: string }> = {
  serial: { label: "Serial", placeholder: "Ex.: 48575443FFAD22A6", param: "serial" },
  contract: { label: "Contrato", placeholder: "Ex.: 7362", param: "contract" },
};

export function DeviceSearch() {
  const [mode, setMode] = useState<SearchMode>("serial");
  const [query, setQuery] = useState("");
  const [device, setDevice] = useState<DeviceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setDevice(null);

    try {
      const param = MODE_LABELS[mode].param;
      const res = await fetch(`/api/equipamentos/dispositivo?${param}=${encodeURIComponent(trimmed)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Falha ao buscar dispositivo.");
      setDevice(body as DeviceDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <h3 className="text-sm font-medium text-text-muted">Buscar dispositivo</h3>
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 bg-surface-hover border border-border rounded-lg p-1">
          {(Object.keys(MODE_LABELS) as SearchMode[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setMode(option);
                setDevice(null);
                setError(null);
              }}
              className={
                mode === option
                  ? "brand-gradient text-white px-3 py-1.5 rounded-md text-sm font-medium"
                  : "px-3 py-1.5 rounded-md text-sm text-text-muted hover:text-text transition-colors"
              }
            >
              {MODE_LABELS[option].label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && search()}
          placeholder={MODE_LABELS[mode].placeholder}
          className="flex-1 min-w-48 bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brand-green/60"
        />
        <button
          type="button"
          onClick={search}
          disabled={loading || !query.trim()}
          className="brand-gradient text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </div>

      {error && <p className="text-semantic-warning text-sm">{error}</p>}

      {device && (
        <div className="space-y-4 pt-2 border-t border-border">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={
                device.online
                  ? "text-xs font-semibold px-2 py-1 rounded-full bg-semantic-success/15 text-semantic-success"
                  : "text-xs font-semibold px-2 py-1 rounded-full bg-semantic-warning/15 text-semantic-warning"
              }
            >
              {device.online ? "Online" : "Offline"}
            </span>
            {device.unstableConnection && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-semantic-caution/15 text-semantic-caution">
                Instável
              </span>
            )}
            <span className="text-sm text-text-muted">
              {device.vendor} {device.model} · {device.installedRelease}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wide">Serial TR-069</p>
              <p className="truncate" title={device.serialTr069}>
                {device.serialTr069}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wide">MAC</p>
              <p>{device.mac}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wide">RX / TX</p>
              <p>
                {formatDbm(device.ponRxPower)} / {formatDbm(device.ponTxPower)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wide">Uptime</p>
              <p>{formatUptime(device.sysUpTimeSeconds)}</p>
            </div>
            {device.contractReference && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Contrato</p>
                <p>{device.contractReference}</p>
              </div>
            )}
            {device.lastContact && (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Último contato</p>
                <p>
                  {new Date(device.lastContact).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </p>
              </div>
            )}
          </div>

          {device.wans.length > 0 && (
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wide mb-2">WANs</p>
              <div className="space-y-1 text-sm">
                {device.wans.map((wan, index) => (
                  <p key={index} className="text-text-muted">
                    <span className="text-text">{wan.connectionType}</span> · {wan.status}
                    {wan.ipv4 ? ` · ${wan.ipv4}` : ""}
                  </p>
                ))}
              </div>
            </div>
          )}

          {device.wifi.length > 0 && (
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Wi-Fi</p>
              <div className="space-y-1 text-sm">
                {device.wifi.map((wifi, index) => (
                  <p key={index} className="text-text-muted">
                    <span className="text-text">{wifi.ssid}</span> · {wifi.band} · canal {wifi.channel} ·{" "}
                    {wifi.status}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
