import type { EquipmentsSummary } from "@/types/devices";

const REVALIDATE_MS = 5 * 60 * 1000;

/**
 * Cache stale-while-revalidate em memória do processo. Uma sincronização
 * completa custa ~400 chamadas à API Flashman e leva dezenas de segundos —
 * nenhuma requisição de usuário deve pagar esse custo de forma síncrona.
 * Quando o cache expira, o snapshot anterior continua sendo servido
 * instantaneamente enquanto uma atualização roda em background.
 *
 * Isso vive na memória da instância serverless: em cold start (ou se o
 * Vercel distribuir a próxima requisição para uma instância diferente),
 * a primeira chamada nessa instância ainda bloqueia até terminar a
 * sincronização. Para uma ferramenta interna de baixo tráfego isso é um
 * trade-off aceitável frente à complexidade de um cache externo (Redis/KV).
 */
let cached: { data: EquipmentsSummary; expiresAt: number } | null = null;
let inFlight: Promise<EquipmentsSummary> | null = null;

function startRefresh(compute: () => Promise<EquipmentsSummary>): Promise<EquipmentsSummary> {
  if (!inFlight) {
    inFlight = compute()
      .then((fresh) => {
        cached = { data: fresh, expiresAt: Date.now() + REVALIDATE_MS };
        return fresh;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export async function getEquipmentsSummary(
  compute: () => Promise<EquipmentsSummary>,
  force: boolean,
): Promise<EquipmentsSummary> {
  if (force) {
    return startRefresh(compute);
  }

  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  if (cached) {
    // Stale, mas existe algo pra mostrar: dispara refresh em background e
    // devolve o snapshot anterior na hora, sem bloquear o usuário.
    startRefresh(compute);
    return cached.data;
  }

  // Nada em cache ainda (cold start) — não tem o que servir, precisa esperar.
  return startRefresh(compute);
}
