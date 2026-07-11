/**
 * Lista de INCLUSÃO (não de exclusão): quando preenchida, os indicadores do
 * HC passam a ser calculados só a partir destes seriais TR-069 — não da
 * base inteira. Enquanto estiver vazia, o dashboard continua varrendo a
 * base inteira (menos IGNORED_VENDORS, abaixo) como hoje.
 */
export const TRACKED_SERIALS: string[] = [];

export function hasTrackedSerialsList(): boolean {
  return TRACKED_SERIALS.length > 0;
}

/**
 * Fabricantes fora da operação real (ex.: equipamento de teste) — só entra
 * em jogo no modo "base inteira" (TRACKED_SERIALS vazia). Com uma lista de
 * inclusão ativa, o que não está na lista já nem é buscado.
 */
export const IGNORED_VENDORS = ["TP-Link"];

export function isIgnoredVendor(vendor: string | undefined): boolean {
  return vendor != null && IGNORED_VENDORS.includes(vendor);
}
