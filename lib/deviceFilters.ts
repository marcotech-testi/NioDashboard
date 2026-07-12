import { readFileSync } from "fs";
import { join } from "path";

/**
 * Lista de INCLUSÃO (não de exclusão): quando preenchida, os indicadores do
 * HC passam a ser calculados só a partir destes seriais TR-069 — não da
 * base inteira. Enquanto o arquivo não existir/estiver vazio, o dashboard
 * continua varrendo a base inteira (menos IGNORED_VENDORS, abaixo).
 *
 * ~18 mil seriais é grande demais pra um array literal no código-fonte —
 * fica em data/tracked-serials.txt (um serial por linha, sem PII; a
 * planilha original com nome/CPF nunca é versionada, ver .gitignore).
 * Lido uma vez por instância e cacheado em memória.
 */
const TRACKED_SERIALS_FILE = join(process.cwd(), "data", "tracked-serials.txt");

let cachedSet: Set<string> | null = null;

export function getTrackedSerialsSet(): Set<string> {
  if (cachedSet) return cachedSet;

  try {
    const content = readFileSync(TRACKED_SERIALS_FILE, "utf-8");
    const serials = content
      .split("\n")
      .map((line) => line.trim().toUpperCase())
      .filter((line) => line.length > 0);
    cachedSet = new Set(serials);
  } catch {
    cachedSet = new Set();
  }

  return cachedSet;
}

export function hasTrackedSerialsList(): boolean {
  return getTrackedSerialsSet().size > 0;
}

/**
 * Fabricantes fora da operação real (ex.: equipamento de teste) — só entra
 * em jogo no modo "base inteira" (lista de inclusão vazia). Com a lista
 * ativa, o que não está nela já nem compõe os indicadores.
 */
export const IGNORED_VENDORS = ["TP-Link"];

export function isIgnoredVendor(vendor: string | undefined): boolean {
  return vendor != null && IGNORED_VENDORS.includes(vendor);
}
