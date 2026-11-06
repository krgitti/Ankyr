# Ankyr — laboratório digital do Mecanismo de Antikythera

Emulador mecânico e matemático do Mecanismo de Antikythera: **69 rodas dentadas**, cinco
mostradores traseiros, nove indicadores frontais e um motor de cálculo em números racionais
exactos. Não é uma animação do mecanismo — é o mecanismo, com a mesma cadeia de transmissão.

> **Princípio de desenho.** Existe uma única entrada: a roda motriz `b1`. Todas as 69 taxas
> são resolvidas percorrendo o grafo de acoplamentos com aritmética racional exacta
> (`BigInt`), e cada ponteiro do ecrã é lido do estado resultante. Não há uma única rotação
> escrita à mão. Se uma roda gira no ecrã, é porque a cadeia a faz girar.

```bash
npm install
npm run dev        # http://localhost:5173 — laboratório interactivo
npm test           # 79 verificações (cinemática, calendários, geometria, efemérides, validação)
npm run report     # regenera docs/relatorio-validacao.md e docs/mecanica.md a partir do código
npm run typecheck  # tsc --noEmit, modo estrito
npm run build      # bundle de produção
```

---

## 1. O que está implementado

| Domínio | Estado | Onde |
| --- | --- | --- |
| Catálogo de 69 rodas (30 preservadas) com dentes, módulo, raio primitivo, eixo, plano z, evidência | completo | `src/core/gears.ts`, `src/core/layout.ts` |
| Solução cinemática exacta (razões racionais, ordem de propagação, três referenciais móveis) | completo | `src/core/kinematics.ts` |
| Dispositivo de pino e ranhura (anomalia lunar e os cinco planetas) | completo | `src/core/kinematics.ts`, `src/core/mechanism.ts` |
| Sol excêntrico de Hiparco (e = 1/24, apogeu em Gémeos 5½°) | completo | `src/core/mechanism.ts` |
| Nove indicadores frontais | completo | `src/core/mechanism.ts` |
| Meton (235), Saros (223) com glifos de eclipse, Exeligmo (3), Olimpíadas (4), Calíptico (76) | completo | `src/core/calendar.ts`, `src/core/eclipses.ts` |
| Previsão de eclipses pelo modelo de Freeth 2014 (EYM: 223 meses, 446 EYu) | completo | `src/core/eclipses.ts` |
| Verificação contra efemérides modernas | completo | `src/core/ephemeris.ts`, `src/core/validation.ts` |
| Vista 3D com dentes reais, corte, explosão, inspecção roda a roda | completo | `src/three/` |
| Interface de simulação (manivela, ±1 dia/mês/ano/século, velocidade, inversão) | completo | `src/ui/` |
| Bateria de validação com relatório exportável | completo | `src/core/validation.ts` |
| Documentação auditável gerada a partir do código | completo | `docs/` |

---

## 2. A cadeia de transmissão, em números

Todas as razões são **exactas**. `Q` guarda numerador e denominador em `BigInt`; nunca há
arredondamento intermédio.

| Roda / trem | Relação | Valor | Evidência |
| --- | --- | --- | --- |
| Lua sideral (`b3`) | 64/38 · 48/24 · 127/32 = **254/19** voltas/ano | 13.3684 | A |
| Mês sinódico (`g1`) | 254/19 − 940/4237 | 29.53085 d | A |
| Nodos (`nodes48`) | 1 − (49/62)·(64/48) = **5/93** voltas/ano | 0.05376 | D |
| Meton (`n1`) | 5/19 voltas/ano | 1 volta / 4 Saros | A |
| Saros (`g1`) | 940/4237 voltas/ano | 4 voltas / 223 meses | A |
| Exeligmo (`i1`) | 235/12711 voltas/ano | 1 volta / 669 meses | A |
| Calíptico (`q1`) | 1/76 voltas/ano | 76 anos | A |
| Olímpico (`o1`) | 1/4 voltas/ano | 4 anos | A |
| Mercúrio sinódico | 1513/480 | 3.1521 | A |
| Vénus sinódico | 289/462 | 0.6255 | A |
| Marte sinódico | 133/284 | 0.4683 | A |
| Júpiter sinódico | 315/344 | 0.9157 | A |
| Saturno sinódico | 427/442 | 0.9661 | A |

**Um resultado que vale a pena ver.** A roda de 56 dentes do Sol não está fixa à caixa, mas
sai **parada no referencial da caixa**: é o planeta de um par 56/52 que rola dentro de um anel
fixo de 56 dentes, e o termo do carreiro cancela exactamente a rotação do par. Por isso o
ponteiro do Sol é imóvel e é o **anel zodiacal que gira por trás dele** — que é precisamente
como o mostrador frontal funciona. A verificação `kinematics` fixa este resultado.

---

## 3. Precisão alcançada

Erro RMS da posição mecânica contra efemérides independentes, janela de 730 dias em torno da
época (244 a.C. – 50 a.C. na bateria longa):

| Corpo | RMS (730 d) | RMS (250–50 a.C.) | Viés |
| --- | --- | --- | --- |
| Sol | 0.26° | 0.66° | 0.41° |
| Lua | 1.07° | 4.06° | 2.68° |
| Nodos | 0.007° | 1.01° | 0.69° |
| Mercúrio | 5.27° | 4.94° | — |
| Vénus | 0.82° | 2.61° | — |
| Marte | 4.72° | 15.02° | 7.04° |
| Júpiter | 0.64° | 5.50° | 3.96° |
| Saturno | 0.65° | 6.45° | 3.76° |

Estes números **não medem o emulador, medem a astronomia grega**. As engrenagens são exactas;
as teorias que elas materializam são aproximações de segunda ordem. A deriva de Marte cresce
linearmente com o tempo porque o período sinódico inscrito (133/284) difere do moderno; a
Terra não está no centro do epiciclo de Hiparco exactamente como o pino supõe.

Previsão de eclipses, num ciclo completo de 223 meses:

| | Previstos | Confirmados |
| --- | --- | --- |
| Eclipses lunares (Σ) | 38 | **38 / 38** |
| Eclipses solares (Η) | 28 | **28 / 28** |
| Abrangência (eclipses reais previstos) | | 75 % |

A precisão é total; a abrangência não, e não pode ser: as inscrições do mecanismo marcam
apenas os eclipses cujo máximo cai perto de uma hora específica do dia (a letra de hora do
glifo). Os eclipses reais fora dos limites inscritos — norte 20 EYu, sul 7 EYu — estão fora
por construção.

---

## 3.1 Interface

Na vista 3D: **Frente / Traseira / Lateral / Topo / Explodido**, arrastar para orbitar, roda do
rato para ampliar, clique numa roda para a inspeccionar (clique repetido desce às rodas
empilhadas por trás). No canto:

- **◐ Raios X** — cada roda tingida pela cadeia a que pertence (legenda à direita), desenhada
  com o seu círculo primitivo. O modo é *não iluminado*: não depende de luz nem de ambiente,
  portanto nunca escurece.
- **Nomes** — etiquetas dos cinco mostradores traseiros e dos dois anéis frontais.
- **camadas** — afasta as rodas ao longo do eixo do mecanismo (×1 a ×2,6), para ver a pilha.

## 4. O que é evidência e o que é hipótese

Todo o componente do modelo carrega um grau, exibido na interface e no catálogo:

- **A · Atestado** — preservado fisicamente (roda, escala, inscrição, tomografia).
- **B · Derivado** — imposto aritmeticamente pelos dados de A.
- **C · Reconstrução** — proposto por uma reconstrução publicada e compatível com as evidências.
- **D · Hipótese** — sem evidência física directa do componente ou da função.

Exemplos concretos: as 30 rodas sobreviventes são A; o número de dentes de uma roda perdida que
uma relação inscrita exige é B; o trem dos planetas superiores de 2021 é C; a **Mão do Dragão**
(ponteiro dos nodos) é **D** — está implementada, e está marcada como hipótese em todo o lado
onde aparece.

O emulador nunca apresenta uma reconstrução como facto. O painel *Sobre* lista, item por item,
o que é medido e o que é inferido.

---

## 5. Limites declarados

1. **Posição 3D**: derivada das distâncias de engrenamento e da ordem dos planos (30 planos,
   83 mm de profundidade), não de uma tomografia roda a roda. O que é medido: raios de algumas
   rodas, dentes preservados, ordem das placas.
2. **Modelo planetário**: epiciclo grego materializado em pino-e-ranhura. A equação que o
   dispositivo produz é, em segunda ordem, a do epiciclo, mas não há segunda excentricidade nem
   inclinação orbital — daí os graus de divergência da tabela acima.
3. **Calibração**: seis fases de montagem e oito deslocamentos de anel, ajustados uma vez contra
   a efeméride e reproduzíveis por `tests/calibration.test.ts`. Não alteram nenhuma taxa.
4. **Sem dados inventados**: onde a evidência não chega, o campo diz `hipótese` e o grau é D.
5. **Referência bibliográfica**: apenas literatura publicada até 31 de Dezembro de 2021.

---

## 6. Arquitectura

```
src/core/      motor puro — sem DOM, sem render, executável em Node
  rational.ts      Q: racionais exactos em BigInt
  gears.ts         catálogo de 69 rodas, arestas, referenciais, constantes de pino-e-ranhura
  kinematics.ts    solução exacta das taxas + propagação de ângulos
  mechanism.ts     leitura dos mostradores (9 indicadores + 5 mostradores traseiros)
  calendar.ts      Meton, Calíptico, Olimpíadas, geometria das espirais
  eclipses.ts      modelo EYM de Freeth 2014, glifos, temporadas
  time.ts          JD ↔ calendário juliano, ano egípcio, zodíaco
  layout.ts        eixos por intersecção de círculos primitivos, planos, caixa
  ephemeris.ts     efeméride moderno — SÓ para verificação, nunca alimenta o mecanismo
  validation.ts    bateria de 57 verificações + relatório
  fit.ts           ajuste das fases de montagem
src/three/     geometria 3D (dentes reais, texturas de mostrador em canvas)
src/ui/        React: simulador, painéis, manivela, inspecção
tests/         79 verificações em vitest
scripts/       geração de documentação
docs/          documentação auditável (parte gerada pelo código)
```

A lógica nunca depende do render: `npm test` corre todo o motor em Node, sem browser.

---

## 7. Documentação

| Documento | Conteúdo |
| --- | --- |
| [`docs/matematica.md`](docs/matematica.md) | todas as equações, derivações e constantes |
| [`docs/mecanica.md`](docs/mecanica.md) | catálogo completo das 69 rodas, acoplamentos, planos (gerado) |
| [`docs/relatorio-validacao.md`](docs/relatorio-validacao.md) | as 57 verificações, com valores e tolerâncias (gerado) |
| [`docs/arquitetura.md`](docs/arquitetura.md) | fluxo de dados, determinismo, como estender |
| [`docs/protocolo-10-fases.md`](docs/protocolo-10-fases.md) | o protocolo de dez fases e o estado de cada uma |

---

## 8. Fontes

Base científica até 31/12/2021, principalmente:

- Freeth, T., Higgon, D., Dacanalis, A., MacDonald, L., Georgakopoulou, M., Wojcik, A. (2021).
  *A Model of the Cosmos in the ancient Greek Antikythera Mechanism.* Scientific Reports 11:5821.
  doi:10.1038/s41598-021-84310-w
- Efstathiou, K., Basiakoulis, A., Efstathiou, M., Anastasiou, M., Boutbaras, P. (2021).
  *The Antikythera Mechanism: the construction of the metonic pointer and the back plate spirals.*
  Heritage 4(4). doi:10.3390/heritage4040211
- Freeth, T. (2014). *Eclipse prediction on the Antikythera Mechanism.*
- Freeth, T., Jones, A. (2012). *The cosmos in the Antikythera Mechanism.*
- Freeth, T. et al. (2006). *Decoding the ancient Greek astronomical calculator.* Nature 444.

Catálogo completo em `src/core/sources.ts`, com o que cada fonte fornece a este emulador.

---

*Código original. O modelo de 2021 é reconstrução publicada: onde este emulador diverge dele,
a divergência está assinalada e justificada, não escondida.*
