import { NextRequest, NextResponse } from "next/server";
import { fetchStatsForDate, StatsApiError } from "@/lib/statsApi";
import { normalizeNioRows, nioGrandTotal } from "@/lib/filterNioTags";
import { lookbackDates, todayStr, MIN_DATE } from "@/lib/dateRules";
import type { PeriodPreset, StatsResponse } from "@/types/stats";

const VALID_PERIODS: PeriodPreset[] = [1, 7, 30];

/**
 * Proxy server-side para a API do Hub MatrixDoBrasil. Nunca expõe o token ao
 * cliente e nunca chama a API diretamente do browser (evita mixed-content,
 * já que a origem é http:// e o site roda em https:// na Vercel).
 *
 * Em vez de repassar `period` direto para a API (o parâmetro não se mostrou
 * confiável para escopar range de datas nos testes feitos durante o
 * planejamento — variar initialDate/finalDate não alterou o resultado), cada
 * dia da janela solicitada é buscado individualmente e agregado aqui.
 */
export async function GET(request: NextRequest) {
  const periodParam = request.nextUrl.searchParams.get("period");
  const period = Number(periodParam ?? 1) as PeriodPreset;

  if (!VALID_PERIODS.includes(period)) {
    return NextResponse.json({ error: "Parâmetro period inválido. Use 1, 7 ou 30." }, { status: 400 });
  }

  const finalDate = todayStr();
  const dates = lookbackDates(period, finalDate);

  if (dates.length === 0) {
    return NextResponse.json<StatsResponse>({
      period,
      finalDate,
      minDate: MIN_DATE,
      rows: [],
      trend: period > 1 ? [] : null,
    });
  }

  try {
    const perDay = await Promise.all(
      dates.map(async (date) => ({ date, raw: await fetchStatsForDate(date) })),
    );

    const rows = normalizeNioRows(perDay.flatMap((day) => day.raw));
    const trend =
      period > 1 ? perDay.map((day) => ({ date: day.date, total: nioGrandTotal(day.raw) })) : null;

    return NextResponse.json<StatsResponse>({ period, finalDate, minDate: MIN_DATE, rows, trend });
  } catch (error) {
    const status = error instanceof StatsApiError ? 502 : 500;
    const message = error instanceof Error ? error.message : "Erro desconhecido ao consultar estatísticas.";
    return NextResponse.json({ error: message }, { status });
  }
}
