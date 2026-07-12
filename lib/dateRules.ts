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
 * A API externa não respeitou initialDate/finalDate nos testes feitos durante
 * o planejamento (variar o range não mudou o resultado); o que muda o volume
 * retornado é o parâmetro `period`, funcionando como "últimos N dias a partir
 * de finalDate". Para montar a tendência diária, cada dia da janela é buscado
 * individualmente com period=1, e dias anteriores a MIN_DATE são descartados
 * sem chamar a API.
 *
 * `finalDate` já vem ancorado em América/São_Paulo (de `todayStr`); a
 * subtração de dias aqui é aritmética pura de calendário em UTC — isso é
 * seguro porque não há hora do dia envolvida, só dias inteiros.
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
