"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardNav } from "@/components/DashboardNav";
import { StatCardGrid } from "@/components/StatCardGrid";
import { DistributionDonutChart } from "@/components/DistributionDonutChart";
import { DistributionBarChart } from "@/components/DistributionBarChart";
import { DeviceSearch } from "@/components/DeviceSearch";
import { Spinner } from "@/components/Spinner";
import type { EquipmentsSummary } from "@/types/devices";

const AUTO_REFRESH_MS = 5 * 60 * 1000;

function formatDbm(value: number | null): string {
  return value === null ? "—" : `${value.toLocaleString("pt-BR")} dBm`;
}

function formatPercent(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—";
}

export default function EquipmentsPage() {
  const [data, setData] = useState<EquipmentsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const load = useCallback(async (force: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (force) setSyncing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/equipamentos${force ? "?force=true" : ""}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Falha ao carregar equipamentos.");
      setData(body as EquipmentsSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
      setSyncing(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    load(false);
    const interval = setInterval(() => load(false), AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  const counts = data?.counts;
  const signal = data?.signal;

  const generalCards = counts
    ? [
        { label: "Total de dispositivos", value: counts.total.toLocaleString("pt-BR") },
        { label: "Online", value: counts.online.toLocaleString("pt-BR") },
        { label: "Offline", value: counts.offline.toLocaleString("pt-BR") },
        { label: "Instáveis", value: counts.unstable.toLocaleString("pt-BR") },
        { label: "% Online", value: formatPercent(counts.online, counts.total) },
        { label: "% Offline", value: formatPercent(counts.offline, counts.total) },
      ]
    : [];

  const signalCards = signal
    ? [
        { label: "Sinal bom", value: signal.good.toLocaleString("pt-BR") },
        { label: "Sinal médio", value: signal.weak.toLocaleString("pt-BR") },
        { label: "Sinal ruim", value: signal.bad.toLocaleString("pt-BR") },
        { label: "Sem sinal (PON)", value: signal.noSignal.toLocaleString("pt-BR") },
        { label: "Média RX", value: formatDbm(data?.averages.rxPower ?? null) },
      ]
    : [];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-text-muted">NIO</p>
        <h1 className="text-3xl font-semibold brand-gradient-text">Indicadores HC</h1>
        <DashboardNav />
      </header>

      <DeviceSearch />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-muted">
          {data
            ? `Atualizado às ${new Date(data.fetchedAt).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
            : ""}
        </p>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={syncing || loading}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-border hover:border-brand-green/60 text-text-muted hover:text-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {syncing && <Spinner className="h-4 w-4 text-current" />}
          {syncing ? "Sincronizando… pode levar até 1 minuto" : "Atualizar agora"}
        </button>
      </div>

      {loading && !data && (
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <Spinner />
          Carregando indicadores…
        </div>
      )}

      {!loading && error && (
        <div className="card p-5 border-semantic-warning/40">
          <p className="text-semantic-warning text-sm font-medium">Não foi possível carregar os dados.</p>
          <p className="text-text-muted text-sm mt-1">{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <StatCardGrid cards={generalCards} />
          <StatCardGrid cards={signalCards} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DistributionDonutChart title="Equipamentos por fabricante" data={data.distribution.vendor} />
            <DistributionBarChart title="Equipamentos por modelo" data={data.distribution.model} />
          </div>
          <DistributionBarChart title="Equipamentos por firmware" data={data.distribution.firmware} />
        </div>
      )}
    </main>
  );
}
