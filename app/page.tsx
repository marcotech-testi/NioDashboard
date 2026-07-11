"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardNav } from "@/components/DashboardNav";
import { FilterBar } from "@/components/FilterBar";
import { KpiCards } from "@/components/KpiCards";
import { TagChannelBarChart } from "@/components/TagChannelBarChart";
import { ChannelDonutChart } from "@/components/ChannelDonutChart";
import { TrendLineChart } from "@/components/TrendLineChart";
import { DetailTable } from "@/components/DetailTable";
import { recomputePercentages } from "@/lib/filterNioTags";
import { MIN_DATE } from "@/lib/dateRules";
import type { PeriodPreset, StatsResponse } from "@/types/stats";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MIN_DATE_LABEL = format(new Date(`${MIN_DATE}T00:00:00`), "d 'de' MMMM 'de' yyyy", { locale: ptBR });

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodPreset>(1);
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<Set<string> | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/stats?period=${period}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Falha ao carregar estatísticas.");
        return body as StatsResponse;
      })
      .then((body) => {
        if (cancelled) return;
        setData(body);
        setSelectedChannels(null);
        setSelectedTags(null);
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
  }, [period]);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const channels = useMemo(() => Array.from(new Set(rows.map((row) => row.channel))).sort(), [rows]);
  const tags = useMemo(() => Array.from(new Set(rows.map((row) => row.tag))).sort(), [rows]);

  const filteredRows = useMemo(
    () =>
      recomputePercentages(
        rows.filter(
          (row) =>
            (selectedChannels === null || selectedChannels.has(row.channel)) &&
            (selectedTags === null || selectedTags.has(row.tag)),
        ),
      ),
    [rows, selectedChannels, selectedTags],
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-text-muted">NIO</p>
        <h1 className="text-3xl font-semibold brand-gradient-text">Indicadores de Atendimento</h1>
        <p className="text-sm text-text-muted">Histórico de dados disponível a partir de {MIN_DATE_LABEL}.</p>
        <DashboardNav />
      </header>

      <FilterBar
        period={period}
        onPeriodChange={setPeriod}
        channels={channels}
        selectedChannels={selectedChannels}
        onChannelsChange={setSelectedChannels}
        tags={tags}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
      />

      {loading && <p className="text-text-muted text-sm">Carregando indicadores…</p>}

      {!loading && error && (
        <div className="card p-5 border-semantic-warning/40">
          <p className="text-semantic-warning text-sm font-medium">Não foi possível carregar os dados.</p>
          <p className="text-text-muted text-sm mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="card p-8 text-center space-y-1">
          <p className="text-text-muted">Nenhum atendimento NIO encontrado no período selecionado.</p>
          <p className="text-text-muted text-xs">Lembrete: o histórico só cobre datas a partir de {MIN_DATE_LABEL}.</p>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="space-y-6">
          <KpiCards rows={filteredRows} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TagChannelBarChart rows={filteredRows} />
            <ChannelDonutChart rows={filteredRows} />
          </div>
          <TrendLineChart trend={data?.trend ?? null} />
          <DetailTable rows={filteredRows} />
        </div>
      )}
    </main>
  );
}
