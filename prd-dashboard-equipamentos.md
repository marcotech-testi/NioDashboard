# PRD – Dashboard de Dispositivos Flashman

> **Nota de atualização**: este PRD foi revisado após testar a API real (ambiente de produção, ~19.800 dispositivos — host e credenciais em `.env.local`, fora do controle de versão). A API é a **V3** (não a V2 assumida na versão original), e não existe endpoint capaz de retornar a base inteira em uma única chamada — a busca de dispositivos é paginada com no máximo 50 registros por página. As seções abaixo foram ajustadas para refletir o comportamento real confirmado; mudanças relevantes estão marcadas com **[Atualizado]**.

## 1. Objetivo

Desenvolver um dashboard operacional para monitoramento da base de dispositivos gerenciados pelo Flashman, fornecendo indicadores em tempo real sobre conectividade, qualidade de sinal e distribuição dos equipamentos.

O dashboard deverá consumir os dados da API do Flashman e realizar todas as agregações e cálculos no backend da aplicação, minimizando o número de chamadas à API. **[Atualizado]** Como a API não oferece uma chamada única que devolva a base inteira, "minimizar chamadas" passa a significar: usar os endpoints de contagem agregada sempre que possível, e cachear o resultado da sincronização completa por 5 minutos no backend, para que múltiplos usuários acessando o dashboard não multipliquem o custo de API.

---

# 2. Objetivos de Negócio

- Disponibilizar uma visão consolidada da infraestrutura de clientes.
- Facilitar a identificação de problemas de conectividade.
- Monitorar a qualidade do sinal óptico dos dispositivos.
- Acompanhar a distribuição da base instalada por fabricante, modelo e versão de firmware.
- Reduzir o tempo gasto na análise operacional da rede.

---

# 3. Fonte de Dados **[Atualizado]**

## API

Flashman API V3 (documentação Swagger disponível em `/api-docs/` na própria instância).

## Autenticação

HTTP Basic Auth. Credenciais de automação já configuradas em `.env.local` (não versionado — ver `.env.local.example` para o formato):

```
FLASHMAN_URL=...
FLASHMAN_USER=...
FLASHMAN_PASSWORD=...
```

Testado ao vivo (`curl -u`) — autenticação confirmada, base real com **19.804 dispositivos** no momento do teste.

## Endpoints usados

A base inteira **não** pode ser obtida em uma única chamada: o endpoint de busca por dispositivo limita a 50 registros por página (`pageLimit`, máximo 50). Em vez disso, o dashboard combina três tipos de chamada, todas somente leitura (GET):

### 3.1 Contagens agregadas — online / offline / instável

```
GET /api/v3/device/connection-status/v2
```

Retorna contagens já calculadas pelo próprio Flashman, sem precisar baixar dispositivo por dispositivo:

```json
{ "success": true, "message": "OK", "totalCount": 19804, "onlineCount": 18802, "unstableCount": 84, "offlineCount": 918 }
```

Cobre os KPIs de 4.1 a 4.4 em **uma única chamada leve**. Também expõe um terceiro estado, `unstableCount` ("instável"), que a versão anterior deste PRD não previa — ver seção 4.6.

### 3.2 Contagens agregadas — qualidade de sinal

Mesmo endpoint, filtrado por `ponRxPower` (classificação já feita pelo Flashman, não precisamos reimplementar as faixas de dBm):

```
GET /api/v3/device/connection-status/v2?ponRxPower=good
GET /api/v3/device/connection-status/v2?ponRxPower=weak
GET /api/v3/device/connection-status/v2?ponRxPower=bad
GET /api/v3/device/connection-status/v2?ponRxPower=noSignal
```

Testado ao vivo: `good=19396, weak=263, bad=103, noSignal=184` (dispositivos sem PON — ex.: equipamentos não-fibra — entram em `noSignal`, categoria que a versão anterior deste PRD não previa; ver seção 5).

### 3.3 Varredura paginada — distribuição e médias

Para fabricante/modelo/firmware e médias de RX/TX, é necessário o valor por dispositivo, que os endpoints de contagem não fornecem. Usamos busca paginada com **projeção de campos** (`fields=`), que reduz drasticamente o payload (testado: ~180 bytes/dispositivo com projeção vs. ~5.500 bytes sem):

```
GET /api/v3/device/search/?fields=vendor;model;installed_release;pon_rxpower;pon_txpower&page={n}&pageLimit=50
```

Com ~19.800 dispositivos e 50 por página, isso significa **~397 chamadas** por sincronização completa — executadas no backend, com concorrência controlada (ex.: 10 em paralelo), nunca no navegador do usuário.

### Campos utilizados (nomes reais confirmados na API)

| Campo | Descrição | Observação |
|--------|-----------|------------|
| `_id` | Identificador do dispositivo (MAC) | |
| `vendor` | Fabricante | |
| `model` | Modelo | |
| `installed_release` | Versão de firmware instalada | **[Atualizado]** campo chama-se `installed_release`, não `firmware_version` |
| `pon_rxpower` | Potência óptica recebida (RX), em dBm | ausente/`null` em equipamentos sem PON (não-fibra) |
| `pon_txpower` | Potência óptica transmitida (TX), em dBm | idem |

O campo `online` **não existe** no documento do dispositivo — status de conexão só está disponível via o endpoint de contagem agregada (3.1) ou via filtros `online`/`offline`/`unstable` na busca paginada, não como um campo simples no retorno.

### Fabricantes ignorados **[Novo]**

A base real tem 1 dispositivo `vendor: "TP-Link"` no meio de ~19.800 Huawei — não faz parte da operação (equipamento de teste). Ignorado em **todos** os indicadores (`lib/deviceFilters.ts`, constante `IGNORED_VENDORS`):

- Contagens agregadas (3.1/3.2): cada chamada de contagem geral é acompanhada de uma chamada equivalente filtrada por `vendor=TP-Link` (mesmo filtro aceito pelo endpoint), e o resultado é subtraído do total antes de responder.
- Varredura paginada (3.3): dispositivos com fabricante ignorado são descartados antes de calcular distribuição/médias.

Nenhum dado desse fabricante aparece em nenhum KPI, gráfico ou média — nem mesmo no card "Total de dispositivos".

---

# 4. KPIs

## 4.1 Total de Dispositivos

**Descrição**

Quantidade total de dispositivos cadastrados.

**Fonte** **[Atualizado]**

`totalCount` de `GET /api/v3/device/connection-status/v2` (sem filtro).

**Exibição**

Card numérico.

---

## 4.2 Dispositivos Online

**Descrição**

Quantidade de dispositivos conectados.

**Fonte** **[Atualizado]**

`onlineCount` do mesmo endpoint.

**Exibição**

Card numérico.

---

## 4.3 Dispositivos Offline

**Descrição**

Quantidade de dispositivos desconectados.

**Fonte** **[Atualizado]**

`offlineCount` do mesmo endpoint.

**Exibição**

Card numérico.

---

## 4.4 Percentual Online

**Descrição**

Percentual de dispositivos online.

**Cálculo**

```
(onlineCount / totalCount) * 100
```

**Exibição**

Card percentual.

---

## 4.5 Percentual Offline

**Descrição**

Percentual de dispositivos offline.

**Cálculo**

```
(offlineCount / totalCount) * 100
```

**Exibição**

Card percentual.

---

## 4.6 Dispositivos Instáveis **[Novo]**

**Descrição**

A API do Flashman distingue um terceiro estado, "instável" (`unstableCount`), de dispositivos que oscilam entre online/offline. Não existia na versão anterior deste PRD (que assumia só online/offline); como o dado já vem pronto do mesmo endpoint dos demais KPIs de conectividade, incluímos como card adicional em vez de descartar a informação.

**Fonte**

`unstableCount` de `GET /api/v3/device/connection-status/v2`.

**Exibição**

Card numérico, junto da linha de KPIs gerais.

---

# 5. Indicadores de Qualidade do Sinal **[Atualizado]**

A classificação de sinal (Bom/Médio/Ruim) já é calculada pelo próprio Flashman via o filtro `ponRxPower` do endpoint de contagem agregada — o dashboard não precisa reimplementar as faixas de dBm nem teve acesso aos limiares exatos usados internamente pelo Flashman (não documentados no OpenAPI). Caso os limiares exatos sejam necessários no futuro, precisam ser confirmados com o time do Flashman.

## Categorias (nomenclatura da própria API)

| Classificação | Filtro `ponRxPower` | Contagem observada (amostra ao vivo) |
|---------------|---------------------|---------------------------------------|
| 🟢 Bom | `good` | 19.396 |
| 🟡 Médio | `weak` | 263 |
| 🔴 Ruim | `bad` | 103 |
| ⚪ Sem sinal | `noSignal` | 184 |

"Sem sinal" é uma categoria real da API (equipamentos sem informação de PON, tipicamente não-fibra) que a versão anterior deste PRD não previa. Incluída para não mascarar ~1% da base que ficaria de fora das três categorias originais.

### KPIs

- Quantidade de dispositivos com sinal Bom
- Quantidade de dispositivos com sinal Médio
- Quantidade de dispositivos com sinal Ruim
- Quantidade de dispositivos sem sinal (PON)

**Exibição**

Cards numéricos.

---

# 6. Média RX Power

**Campo**

```
pon_rxpower
```

**Fonte dos dados** **[Atualizado]**

Calculada no backend a partir da varredura paginada (seção 3.3), não de um endpoint de agregação — a API não expõe `AVG()` pronto para esse campo.

**Cálculo**

```
AVG(pon_rxpower)
```

**Exibição**

Card em dBm.

Dispositivos sem valor informado (campo ausente/`null`, tipicamente equipamentos sem PON) deverão ser desconsiderados do cálculo.

---

# 7. Média TX Power

**Campo**

```
pon_txpower
```

**Fonte dos dados** **[Atualizado]**

Mesma varredura paginada da seção 6 — os dois valores (`pon_rxpower` e `pon_txpower`) são obtidos na mesma chamada por dispositivo, sem custo adicional de API.

**Cálculo**

```
AVG(pon_txpower)
```

**Exibição**

Card em dBm.

Dispositivos sem valor informado deverão ser desconsiderados.

---

# 8. Distribuição dos Equipamentos

## 8.1 Por Fabricante

Campo utilizado

```
vendor
```

### Exibição

Gráfico de pizza ou barras.

---

## 8.2 Por Modelo

Campo utilizado

```
model
```

### Exibição

Gráfico de barras horizontais.

### Ordenação

Maior quantidade para menor.

---

## 8.3 Por Firmware

Campo utilizado **[Atualizado]**

```
installed_release
```

(campo chamado `firmware_version` na versão original deste PRD; o nome real na API é `installed_release`)

### Exibição

Gráfico de barras.

### Ordenação

Maior quantidade para menor.

---

# 9. Atualização dos Dados **[Atualizado]**

## Atualização Automática

A varredura completa (contagens + paginação de ~397 páginas) roda no backend e fica em cache por **5 minutos** (`revalidate`). Todos os usuários que acessarem o dashboard dentro dessa janela recebem o mesmo resultado cacheado, sem gerar novas chamadas ao Flashman.

## Atualização Manual

Botão:

**Atualizar Agora**

Aciona uma nova sincronização completa ignorando o cache (`cache: "no-store"` nas chamadas subjacentes), atualizando o cache de 5 minutos a partir desse ponto.

---

# 10. Regras de Implementação **[Atualizado]**

- A obtenção dos dispositivos não é uma única chamada (a API não permite) — é uma rotina de sincronização no backend: 1 chamada de contagem geral + 4 chamadas de contagem por qualidade de sinal + ~397 chamadas paginadas com projeção de campos (`fields=`) para distribuição/médias.
- Essa rotina roda no servidor, nunca no navegador do usuário, e fica cacheada por 5 minutos — o frontend sempre recebe uma resposta única e já pronta do nosso próprio backend.
- Todos os cálculos (médias, distribuições, percentuais) são executados no backend.
- O frontend é responsável apenas pela exibição dos dados.
- Os indicadores são recalculados a cada atualização (automática ou manual).
- Dispositivos sem RX ou TX Power são ignorados apenas nas médias, permanecendo contabilizados nos demais indicadores.
- Chamadas paginadas da seção 3.3 rodam com concorrência controlada (não todas as ~397 em paralelo) para não sobrecarregar o Flashman.

---

# 11. Layout Sugerido **[Atualizado — adiciona card de Instáveis e Sem sinal]**

## Linha 1 — KPIs Gerais

| KPI | KPI | KPI | KPI | KPI | KPI |
|-----|-----|-----|-----|-----|-----|
| Total de Dispositivos | Online | Offline | Instáveis | % Online | % Offline |

---

## Linha 2 — Qualidade da Rede

| KPI | KPI | KPI | KPI | KPI |
|-----|-----|-----|-----|-----|
| Sinal Bom | Sinal Médio | Sinal Ruim | Sem Sinal | Média RX / Média TX |

---

## Linha 3 — Distribuições

- Equipamentos por Fabricante
- Equipamentos por Modelo

---

## Linha 4

- Equipamentos por Firmware

---

# 12. Requisitos Funcionais

- Consultar dispositivos utilizando a API Flashman.
- Calcular todos os indicadores no backend.
- Atualizar automaticamente os dados.
- Permitir atualização manual.
- Exibir estado de carregamento durante a consulta.
- Exibir mensagem amigável caso a API esteja indisponível.
- Atualizar os gráficos sem recarregar a página.

---

# 13. Requisitos Não Funcionais **[Atualizado]**

- Tempo de carregamento inferior a 3 segundos para o usuário final **quando os dados estiverem em cache** (o refresh completo de ~400 chamadas paginadas roda em background e pode levar mais tempo — não é o caminho que o usuário espera na tela).
- Interface responsiva.
- Compatível com desktop e tablet.
- Baixo consumo da API: contagens usam endpoints agregados (5 chamadas leves); a varredura paginada só roda uma vez a cada 5 minutos (ou sob demanda via "Atualizar Agora"), nunca por requisição de usuário.

---

# 14. Critérios de Aceite **[Atualizado — novos itens marcados]**

## KPIs

- [ ] Exibir Total de Dispositivos.
- [ ] Exibir quantidade Online.
- [ ] Exibir quantidade Offline.
- [ ] Exibir quantidade Instáveis. *(novo)*
- [ ] Exibir percentual Online.
- [ ] Exibir percentual Offline.
- [ ] Exibir quantidade de sinal Bom.
- [ ] Exibir quantidade de sinal Médio.
- [ ] Exibir quantidade de sinal Ruim.
- [ ] Exibir quantidade Sem Sinal. *(novo)*
- [ ] Exibir média de RX Power.
- [ ] Exibir média de TX Power.

## Gráficos

- [ ] Distribuição por fabricante.
- [ ] Distribuição por modelo.
- [ ] Distribuição por firmware (`installed_release`).

## Atualização

- [ ] Atualização automática a cada 5 minutos.
- [ ] Atualização manual via botão.
- [ ] Dados consistentes com os retornados pela API.

---

# 15. Melhorias Futuras

- Evolução histórica dos KPIs.
- Gráfico de dispositivos online por período.
- Evolução da potência RX ao longo do tempo.
- Filtros por fabricante, modelo e firmware.
- Exportação dos indicadores em CSV ou Excel.
- Dashboard por provedor, POP ou região.
- Alertas para aumento de dispositivos offline.
- Confirmar com o time do Flashman os limiares exatos de dBm usados em `ponRxPower=good/weak/bad`, caso seja necessário exibi-los explicitamente na UI.
