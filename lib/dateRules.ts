import { subDays } from "date-fns";

/**
 * Início do histórico de dados da NIO. Confirmado no PRD; datas anteriores
 * não existem na origem e não devem ser navegáveis nem consultadas.
 */
export const MIN_DATE = "2026-07-10";

/**
 * Fuso de operação da NIO. Brasil não observa horário de verão desde 2019,
 * então America/Sao_Paulo é UTC-3 fixo — sem essa complicação a mais.
 */
const TIME_ZONE = "America/Sao_Paulo";

/**
 * "Hoje" tem que ser sempre o dia em São Paulo, nunca o do runtime do
 * servidor — a Vercel roda funções em UTC por padrão, então `new Date()`
 * formatado sem fuso explícito fica ~3h adiantado. Isso faria o dashboard
 * achar que já é "amanhã" (e mostrar vazio) entre ~21h e meia-noite,
 * horário de Brasília, todo dia. `Intl.DateTimeFormat` com `timeZone`
 * resolve isso nativamente, sem depender do fuso local do processo.
 */
export function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

export function isBeforeMinDate(dateStr: string): boolean {
  return dateStr < MIN_DATE;
}

/**
 * `initialDate`/`finalDate` filtram corretamente quando `period` NÃO é
 * enviado — testado ao vivo: dia 10 (1758) + dia 11 (753) bate exatamente
 * com o range dos dois dias junto (2511). O problema todo era o parâmetro
 * `period`, que "sequestra" o filtro de data (com period=1 sempre vazio,
 * com period>=3 sempre o acumulado inteiro, ignorando as datas).
 *
 * Cada dia da janela é buscado individualmente (sem period) — isso dá o
 * total do período (somando) e a tendência dia a dia de graça, na mesma
 * leva de chamadas. Dias antes de MIN_DATE são descartados sem chamar a API.
 */
export function lookbackDates(period: number, finalDate: string): string[] {
  const dates: string[] = [];
  for (let offset = period - 1; offset >= 0; offset -= 1) {
    const candidate = subDays(new Date(`${finalDate}T00:00:00Z`), offset).toISOString().slice(0, 10);
    if (!isBeforeMinDate(candidate)) {
      dates.push(candidate);
    }
  }
  return dates;
}
