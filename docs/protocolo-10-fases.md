# Protocolo de dez fases

Estado de cada fase, com a evidência que a sustenta. Nenhuma fase foi declarada concluída
antes de as verificações correspondentes passarem.

### Fase 1 — Análise das fontes (até 2021-12-31)

Modelo de 2021 (Freeth, Higgon et al., *Sci. Rep.* 11:5821) decomposto em: 30 rodas
sobreviventes, trens planetários, Placa Circular, pilares/Strap, 15 mm em 9 camadas, razões
inscritas. Efstathiou et al. 2021 para as espirais e o ponteiro metônico. Freeth 2014 para o
modelo EYM. **Concluída** — `src/core/sources.ts` regista o que cada fonte fornece e o grau
de evidência.

### Fase 2 — Relações matemáticas

Extracção das 69 rodas, das razões de dentes e das relações de período. Cada relação inscrita
é escrita como fracção exacta e conferida por dois caminhos independentes. **Concluída** —
`docs/matematica.md`, `TRAIN_PRODUCTS`.

### Fase 3 — Núcleo matemático

Racionais exactos em `BigInt`, normalização angular, sem arredondamento intermédio.
**Concluída** — `rational.ts`, `time.ts`, `tests/rational` implícito em todos os testes.

### Fase 4 — Motor de engrenagens

Grafo de acoplamentos, quatro tipos de aresta (engrenamento, eixo rígido, roda fixa,
pino-e-ranhura), três referenciais móveis, ordem topológica, solução exacta das taxas.
**Concluída** — `gears.ts`, `kinematics.ts`, 23 verificações em `kinematics.test.ts`.

### Fase 5 — Astronomia

Nove indicadores frontais a partir das rodas; epiciclos, excentricidade solar, nodos.
Comparação com efemérides independentes em duas janelas. **Concluída** — `mechanism.ts`,
`ephemeris.ts`, `astro.*`.

### Fase 6 — Calendários e eclipses

Metónico (235/19, 6940 d), Saros (223), Exeligmo (3 Saros, +8 h por setor), Olimpíadas,
Calíptico; glifos EYM, temporadas, letras de hora. **Concluída** — `calendar.ts`,
`eclipses.ts`, 17 verificações em `calendar.test.ts`.

### Fase 7 — Simulador

Manivela (uma volta = 223/48 lunação), passos de 1 dia/mês/ano, décadas e séculos, inversão
temporal, pausa, reposição, velocidade. Tudo reduz-se a "escolher um JD". **Concluída** —
`ui/App.tsx`, `mechanism.test.ts` (determinismo, simetria).

### Fase 8 — Geometria e 3D

Eixos por intersecção de círculos primitivos, 30 planos de profundidade, caixa, mostradores
desenhados em canvas com os nomes gregos, dentes reais (uma roda de 223 dentes tem 223 dentes).
Vistas de frente, traseira, lateral, topo, explodida e em raios X; inspecção roda a roda.
**Concluída** — `layout.ts`, `three/`, 10 verificações em `geometry.test.ts`.

### Fase 9 — Interface astronómica

Data seleccionada, longitudes dos cinco planetas, fase e idade lunar, conjunções e oposições,
possibilidade de eclipse, estado de Meton e Saros, estado mecânico por indicador, comparação
com referência independente. **Concluída** — `ui/panels.tsx`.

### Fase 10 — Validação e documentação

Bateria de 57 verificações, relatório exportável, documentação gerada a partir do código,
marcação de hipóteses. **Concluída** — `validation.ts`, `docs/`.

## Regra de conduta aplicada

Quando uma verificação falhou, a primeira pergunta foi sempre *"a asserção está certa?"*, não
*"como faço passar?"*. Três exemplos em que a asserção estava errada e o motor certo:

| Verificação | Erro real | Correção |
| --- | --- | --- |
| `calendar.sarosExact` | comparava meses-por-ano com um valor de 12.368 | produto exacto em `Q` |
| `relations.mercury` | produto de dentes com o 20 em vez do 40 | 1513/480 |
| `period.Ano de eclipse` | dividia por 19 em vez de 223 | 223 meses / 19 |

E três em que o motor estava errado e a asserção certa: o mapa de deslocamentos do ajuste que
começava nos valores congelados; a função de sizígia que não fechava o intervalo; a
`olympiadOf` que recebia um ano fraccionário.
