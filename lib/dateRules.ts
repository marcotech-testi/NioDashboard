import { format, subDays } from "date-fns";

/**
 * Início do histórico de dados da NIO. Confirmado no PRD; datas anteriores
 * não existem na origem e não devem ser navegáveis nem consultadas.
 */
export const MIN_DATE = "2026-07-10";

export function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
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
 */
export function lookbackDates(period: number, finalDate: string): string[] {
  const dates: string[] = [];
  for (let offset = period - 1; offset >= 0; offset -= 1) {
    const candidate = format(subDays(new Date(`${finalDate}T00:00:00`), offset), "yyyy-MM-dd");
    if (!isBeforeMinDate(candidate)) {
      dates.push(candidate);
    }
  }
  return dates;
}
