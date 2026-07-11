/**
 * Fabricantes fora da operação real (ex.: equipamento de teste) que devem
 * ser ignorados em todos os indicadores do dashboard de equipamentos.
 */
export const IGNORED_VENDORS = ["TP-Link"];

export function isIgnoredVendor(vendor: string | undefined): boolean {
  return vendor != null && IGNORED_VENDORS.includes(vendor);
}
