# PRD — NIO Dashboard (Indicadores de Atendimento)

**Repositório:** https://github.com/marcotech-testi/NioDashboard
**Hospedagem:** Vercel
**Status:** Rascunho v1.0 — pronto para execução via Claude Code
**Autor:** Marco Túlio (MatrixGO)
**Data:** 2026-07-10

---

## 1. Objetivo

Construir um dashboard web para a **NIO** exibindo indicadores de atendimento
(volume de atendimentos por tipo/tag e por canal), consumindo dados de uma
API já existente do Hub MatrixDoBrasil. O dashboard é **somente leitura**,
**sem autenticação**, com filtros de período/dia e visual inspirado no
portal `nio.loviz.com.vc`.

## 2. Contexto

- NIO é atendida via a plataforma de atendimento cujo backend expõe
  estatísticas agregadas por **tag** (tipo de atendimento) e por **canal**.
- Os dados relevantes para a NIO são identificados por **tags que começam
  com `NIO`** dentro do agrupador 1 (`grouperOne=tag`) — a API retorna tags
  de todos os clientes/contextos misturados, então o filtro por prefixo é
  obrigatório no lado do dashboard (ou no proxy).
- Histórico de dados começa em **10/07/2026** — datas anteriores não devem
  ser navegáveis nem consultáveis.
- Não há necessidade de login: qualquer pessoa com o link vê o dashboard.

## 3. Fonte de dados (API)

**Endpoint:**
```
GET http://api.hub.matrixdobrasil.ai:50002/getstatisticstags
```

**Parâmetros observados:**

| Parâmetro | Exemplo | Descrição (a confirmar) |
|---|---|---|
| `initialDate` | `2026-07-10` | Data inicial do período (YYYY-MM-DD) |
| `finalDate` | `2026-07-10` | Data final do período (YYYY-MM-DD) |
| `grouperOne` | `tag` | Primeiro agrupador dos resultados — usar sempre `tag` |
| `grouperTwo` | `canal` | Segundo agrupador — usar sempre `canal` |
| `period` | `1` | Granularidade/agregação temporal — **significado exato não confirmado** |
| `token` | `12345678` | Token de autenticação da API |

> ⚠️ **Risco identificado:** não foi possível alcançar esse endpoint a
> partir do ambiente de preparação deste PRD (a porta `50002` está em rede
> restrita/interna). **A primeira tarefa técnica do Claude Code deve ser
> chamar a API de um ambiente com acesso real** (local do Marco, ou via
> Vercel Function já publicada) e documentar o shape exato do JSON de
> resposta antes de codar os tipos e a UI. Tudo abaixo sobre o formato de
> resposta é **assunção razoável**, não fato confirmado.

**Assunção de shape de resposta** (a validar):
```json
{
  "data": [
    { "grouperOne": "NIO_SUPORTE", "grouperTwo": "whatsapp", "total": 42 },
    { "grouperOne": "NIO_FINANCEIRO", "grouperTwo": "telefone", "total": 17 }
  ]
}
```
Se o shape real divergir (nomes de campo diferentes, aninhamento por
canal dentro de tag, etc.), ajustar o parser sem alterar o resto da
arquitetura.

## 4. Regra de negócio central: filtro por prefixo `NIO`

- Após receber a resposta da API, **descartar todo registro cujo valor de
  tag (grouperOne) não comece com `NIO`** (case-insensitive, mas manter
  o valor original para exibição).
- Esse filtro deve acontecer **no backend (proxy)**, não no cliente —
  evita expor no browser tags de outros clientes que não a NIO.
- Definir como constante configurável (`TAG_PREFIX = "NIO"`) para facilitar
  reuso caso outro cliente peça um dashboard equivalente no futuro.

## 5. Métricas e visualizações

| Bloco | Conteúdo |
|---|---|
| **KPIs no topo** | Total de atendimentos no período · Canal com maior volume · Tag com maior volume · Nº de tags NIO ativas no período |
| **Gráfico de barras (tag × canal)** | Volume por tag, com breakdown empilhado por canal |
| **Gráfico de pizza/donut** | Distribuição percentual por canal |
| **Gráfico de linha/área** | Evolução temporal do volume total (quando o período selecionado cobrir mais de 1 dia) |
| **Tabela detalhada** | Tag, canal, total — ordenável, com export CSV opcional |

## 6. Filtros do dashboard

- **Seletor de data**: dia único ou intervalo (date range picker).
  - `minDate = 2026-07-10` — datas anteriores desabilitadas no picker **e**
    validadas no backend (rejeitar `initialDate < 2026-07-10`).
  - Atalhos comuns: Hoje, Ontem, Últimos 7 dias, Este mês.
- **Período/granularidade** (`period`): expor como seletor apenas depois
  de confirmar o significado real do parâmetro na API.
- **Canal**: multi-select, populado dinamicamente a partir dos canais
  presentes na resposta filtrada (não hardcodear lista de canais).
- **Tag NIO**: multi-select, populado dinamicamente a partir das tags
  `NIO*` presentes na resposta (não hardcodear lista de tags).

## 7. Direção visual

Referência: `nio.loviz.com.vc` (não foi possível acessar a página durante
a escrita deste PRD — recomendo que o Claude Code abra a URL diretamente
via browser, ou que o Marco anexe prints, para replicar fielmente
espaçamento e componentes). Como a NIO roda sobre a stack/marca da LOViZ,
a linguagem visual conhecida da LOViZ é um ponto de partida seguro:

- **Tema escuro** (fundo preto/quase-preto) com *glows* radiais sutis.
- **Gradiente rosa → azul** (`#FF0064` → `#197DF5`, passando por
  violeta `#3C19C8`) como acento em cards de destaque, barras de progresso
  e CTAs — sempre nessa direção, nunca invertido.
- Paleta de apoio: laranja `#FA3200`, amarelo `#FFC81E`, verde `#00D746`
  para estados semânticos (alerta, sucesso, etc.) nos gráficos.
- Cards com cantos arredondados, boa respiração (padding generoso),
  tipografia limpa (sans-serif, ex. Inter como fallback de New Frank).
- Gráficos com paleta consistente por canal/tag (cor fixa por categoria
  entre re-renders, não aleatória).

**Confirmar com o Marco antes de aplicar:** se a NIO já tem uma marca
visual própria (logo, paleta) distinta da LOViZ, ou se o dashboard deve
literalmente herdar a marca LOViZ.

## 8. Arquitetura técnica proposta

- **Framework:** Next.js 14+ (App Router) + TypeScript, deploy nativo na
  Vercel.
- **Estilo:** Tailwind CSS.
- **Gráficos:** Recharts (leve, boa integração React/Tailwind).
- **Backend-for-frontend:** Route Handler (`/api/stats`) que:
  1. Recebe os filtros da UI (datas, período).
  2. Chama a API externa **server-side** (evita expor `token` no
     browser e evita mixed-content, já que a API é `http://` e o site
     roda em `https://` na Vercel).
  3. Aplica o filtro de prefixo `NIO`.
  4. Retorna ao cliente já normalizado e pronto para os gráficos.
- **Variáveis de ambiente** (Vercel):
  - `STATS_API_BASE_URL=http://api.hub.matrixdobrasil.ai:50002`
  - `STATS_API_TOKEN=12345678` (mover para variável — nunca hardcode
    no client bundle)
- **Sem autenticação de usuário** — dashboard público por design. Isso
  reforça por que o token da API **precisa** ficar só no servidor.

## 9. Tempo real vs. cache — decisão tomada

**Decidido: Opção A (tempo real), confirmado com o Marco em 10/07/2026.**
Sem Supabase nem cron no MVP. Reavaliar apenas se a API externa se
mostrar lenta/instável em produção ou se surgir necessidade de reter
histórico além do que ela guarda.

**A — Busca em tempo real (decidida para v1)**
- A cada troca de filtro, a Route Handler chama a API externa direto.
- Cache leve via `fetch` do Next.js (`revalidate: 60`s, por exemplo) só
  para suavizar cliques repetidos no mesmo filtro.
- Prós: zero infraestrutura extra, sem risco de dessincronia, mais
  simples de manter.
- Contras: depende 100% da disponibilidade/latência da API externa;
  sem histórico próprio se a API um dia limitar consultas antigas.

**B — Cache/replicação em banco próprio (Supabase)**
- Um cron job (Vercel Cron ou script agendado) busca periodicamente e
  grava em uma tabela Supabase (`atendimentos_nio`).
- O dashboard lê do Supabase, não da API externa, em tempo de request.
- Prós: performance previsível, dashboard resiliente a quedas da API
  externa, possibilidade de reter histórico além do que a API guarda.
- Contras: mais peças móveis (cron, schema, sync), risco de dado
  "levemente atrasado", trabalho extra de setup do Supabase.

Opção B fica documentada como caminho de evolução, não como parte do MVP:
o menor caminho até um dashboard funcionando é a Opção A, e o volume de
tags/canais da NIO é pequeno o suficiente para não pesar na API a cada
request.

## 10. Estrutura de pastas sugerida

```
NioDashboard/
├── app/
│   ├── page.tsx                 # Dashboard principal
│   ├── api/
│   │   └── stats/route.ts       # Proxy + filtro NIO
│   └── layout.tsx
├── components/
│   ├── FilterBar.tsx
│   ├── KpiCards.tsx
│   ├── TagChannelBarChart.tsx
│   ├── ChannelDonutChart.tsx
│   ├── TrendLineChart.tsx
│   └── DetailTable.tsx
├── lib/
│   ├── statsApi.ts              # cliente da API externa
│   ├── filterNioTags.ts         # regra de prefixo NIO
│   └── dateRules.ts             # minDate = 2026-07-10
├── types/
│   └── stats.ts
└── .env.local.example
```

## 11. Fases de execução (para o Claude Code seguir em ordem)

1. **Descoberta da API**: chamar o endpoint real, capturar o JSON de
   resposta cru, documentar o shape real em `types/stats.ts`. Ajustar
   as seções 3 e 4 deste PRD se algo divergir.
2. **Scaffold do projeto**: Next.js + TypeScript + Tailwind, deploy inicial
   "hello world" na Vercel conectado ao repo.
3. **Route Handler `/api/stats`**: proxy + filtro `NIO*` + validação de
   `minDate`.
4. **Filtros de UI**: date range picker, seletor de canal e tag
   (populados dinamicamente), aplicação dos filtros no fetch.
5. **Visualizações**: KPIs → gráfico de barras → donut → linha de
   tendência → tabela detalhada, nessa ordem de prioridade.
6. **Polimento visual**: tema escuro, gradiente rosa→azul, responsividade.
7. **Deploy final + smoke test**: conferir filtros, datas-limite e
   comportamento sem dados (dia sem atendimento).

## 12. Critérios de aceite

- [ ] Não é possível selecionar ou consultar datas anteriores a 10/07/2026.
- [ ] Apenas tags começando com `NIO` aparecem em qualquer gráfico/tabela.
- [ ] Token da API externa nunca aparece no bundle do cliente (verificar
      no DevTools → Network que as chamadas vão para `/api/stats`, não
      direto para `api.hub.matrixdobrasil.ai`).
- [ ] Dashboard acessível sem login.
- [ ] Filtros de canal e tag refletem dinamicamente o que veio da API
      (não há lista hardcoded desatualizável).
- [ ] Estado vazio (sem dados no período) tratado com mensagem clara,
      não com gráfico quebrado.
- [ ] Deploy funcionando na Vercel a partir do repo
      `marcotech-testi/NioDashboard`.

## 13. Riscos e pontos em aberto

| Risco | Impacto | Mitigação |
|---|---|---|
| Shape real do JSON da API é diferente do assumido | Retrabalho nos tipos/parser | Fase 1 valida antes de codar o resto |
| Significado do parâmetro `period` desconhecido | Filtro de granularidade pode sair errado | Testar variações (`period=1,7,30`) na Fase 1 e documentar |
| API em `http://` (não `https://`) pode gerar mixed-content se chamada do client | Chamadas quebradas no browser | Toda chamada externa passa pelo proxy server-side (seção 8) |
| API pode não suportar bem múltiplos canais/tags em paralelo | Latência alta em filtros amplos | Cache leve (`revalidate`) na Opção A; reavaliar Opção B se necessário |

---

*Documento gerado para consumo pelo Claude Code. Seções marcadas com ⚠️
ou "a confirmar" devem ser resolvidas na Fase 1 antes de prosseguir com
o restante da implementação.*
