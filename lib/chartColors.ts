/**
 * Canais conhecidos usam a cor real da marca — mais reconhecível de cara, e
 * evita duas categorias caindo em tons parecidos (ex.: dois laranjas do hash)
 * quando uma delas é uma fatia bem pequena e já difícil de enxergar.
 */
const KNOWN_KEY_COLORS: Record<string, string> = {
  whatsapp: "#25D366",
  instagram: "#E1306C",
};

/**
 * Paleta fixa para gráficos: cor determinística por categoria (tag ou canal)
 * baseada em hash da string, para permanecer estável entre re-renders e
 * trocas de filtro, sem depender de ordem/índice.
 */
const PALETTE = [
  "#34E37A",
  "#00BCD4",
  "#FFC81E",
  "#B388FF",
  "#FA3200",
  "#4CD9C0",
  "#FF8A3D",
  "#6EE7B7",
  "#5B8DEF",
  "#E5484D",
];

export function colorForKey(key: string): string {
  const known = KNOWN_KEY_COLORS[key.trim().toLowerCase()];
  if (known) return known;

  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
