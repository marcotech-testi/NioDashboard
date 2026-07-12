"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/Spinner";
import type { DeviceStatusListItem } from "@/types/devices";

type DeviceStatusModalProps = {
  status: "offline" | "unstable" | null;
  onClose: () => void;
};

const STATUS_LABEL: Record<"offline" | "unstable", string> = {
  offline: "Offline",
  unstable: "Instáveis",
};

function toCsv(status: string, devices: DeviceStatusListItem[]): string {
  const header = "serial,fabricante,modelo";
  const lines = devices.map((d) => `"${d.serialTr069 ?? ""}","${d.vendor ?? ""}","${d.model ?? ""}"`);
  return [header, ...lines].join("\n");
}

export function DeviceStatusModal({ status, onClose }: DeviceStatusModalProps) {
  const [devices, setDevices] = useState<DeviceStatusListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!status) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDevices([]);

    fetch(`/api/equipamentos/status?status=${status}`, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Falha ao carregar lista.");
        return body.devices as DeviceStatusListItem[];
      })
      .then((list) => {
        if (!cancelled) setDevices(list);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  if (!status) return null;

  function exportCsv() {
    if (!status) return;
    const blob = new Blob([toCsv(status, devices)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hc-${status}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="card w-full max-w-2xl max-h-[80vh] flex flex-col p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text-muted">
            Dispositivos {STATUS_LABEL[status]}
            {!loading && !error && ` (${devices.length})`}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              disabled={loading || devices.length === 0}
              className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-brand-green/60 text-text-muted hover:text-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-text transition-colors text-lg leading-none px-1"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-text-muted text-sm py-8 justify-center">
            <Spinner />
            Carregando lista…
          </div>
        )}

        {!loading && error && <p className="text-semantic-warning text-sm">{error}</p>}

        {!loading && !error && devices.length === 0 && (
          <p className="text-text-muted text-sm py-8 text-center">Nenhum dispositivo encontrado.</p>
        )}

        {!loading && !error && devices.length > 0 && (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="pb-2 pr-4">Serial</th>
                  <th className="pb-2 pr-4">Fabricante</th>
                  <th className="pb-2">Modelo</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device, index) => (
                  <tr key={device.serialTr069 ?? index} className="border-b border-border/50">
                    <td className="py-2 pr-4">{device.serialTr069 ?? "—"}</td>
                    <td className="py-2 pr-4">{device.vendor ?? "—"}</td>
                    <td className="py-2">{device.model ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
