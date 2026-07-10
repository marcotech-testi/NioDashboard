/**
 * Paleta fixa para gráficos: cor determinística por categoria (tag ou canal)
 * baseada em hash da string, para permanecer estável entre re-renders e
 * trocas de filtro, sem depender de ordem/índice.
 */
const PALETTE = [
  "#FF0064",
  "#197DF5",
  "#3C19C8",
  "#FFC81E",
  "#00D746",
  "#FA3200",
  "#00D2EF",
  "#B388FF",
  "#FF8A3D",
  "#4CD9C0",
];

export function colorForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
