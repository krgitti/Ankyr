# Arquitectura

## Princípio

O motor é puro: `src/core/**` não importa React, three.js nem o DOM. Toda a física, os
calendários e a validação correm em Node (`npm test`), sem browser. O render lê um objecto
`Readout` e não calcula nada.

```
                       ┌──────────────┐
   JD (entrada)  ─────▶│ mechanism.ts │─────▶ Readout
                       └──────┬───────┘
                              │ usa
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
      kinematics.ts     calendar.ts       eclipses.ts
      (taxas exactas)   (Meton/Saros)     (glifos EYM)
              │
              ▼
         gears.ts  ◀── layout.ts (eixos, planos, z)
```

## Fluxo de um passo de simulação

1. **Escolha do instante.** O utilizador mexe a manivela, premia um passo ou arrasta a barra de
   velocidade. Tudo produz um número: o JD.
2. **T = (JD − EPOCH)/365.25**, em `Q`.
3. **Estado das rodas.** `kinematics.evaluate(T, fases)` calcula, para cada uma das 69 rodas, o
   ângulo em voltas: média (taxa exacta × T) + fase de montagem + desvio de pino-e-ranhura.
   A propagação segue `SCHEDULE`, uma ordem topológica calculada uma vez no arranque.
4. **Leitura.** `mechanism.longitudes()` combina as rodas em posições angulares; `dials()`
   converte as rodas dos calendários em posições de ponteiro.
5. **Render.** `MechanismScene.update(readout)` aplica `rotation.z` e `position` a cada malha.
   As posições das rodas em carreiro (`b1`, `e3`, `b3`) são recalculadas por rotação do
   referencial.

Não existe estado acumulado: `read(jd)` depende só de `jd`. É por isso que a simulação pode
andar para trás, saltar séculos e ser reproduzida bit a bit.

## Módulos

| Ficheiro | Responsabilidade | Não faz |
| --- | --- | --- |
| `rational.ts` | aritmética racional exacta | não arredonda |
| `gears.ts` | catálogo, arestas, frames, constantes físicas | não calcula taxas |
| `kinematics.ts` | resolver taxas, propagar ângulos | não sabe de calendários |
| `mechanism.ts` | ler mostradores e indicadores | não desenha |
| `calendar.ts` | aritmética dos cinco calendários | não lê as rodas |
| `eclipses.ts` | modelo EYM, glifos | não decide visibilidade |
| `time.ts` | JD, calendário juliano, zodíaco | não modela o mecanismo |
| `layout.ts` | eixos, planos, caixa | não anima |
| `ephemeris.ts` | efeméride moderno | **nunca alimenta o mecanismo** |
| `validation.ts` | 57 verificações, relatório | não corrige o modelo |
| `fit.ts` | ajuste das fases | só corre quando chamado |

## Duas camadas que não se tocam

`src/core/sky.ts` é a única parte do projecto que olha para o céu *a partir de um lugar*. Ela
não calcula um único ângulo de roda: recebe o `Readout` do mecanismo e converte as suas
longitudes em altura e azimute para uma latitude e hora escolhidas. É por isso que a regra
“uma roda conduz tudo” continua verificável por inspecção — nenhum ficheiro de `sky.ts` importa
`gears.ts` nem `kinematics.ts`.

`src/core/provenance.ts` é a outra camada separada: uma tabela de 13 afirmações em que cada
linha tem três colunas obrigatórias — o que foi **medido** no artefacto, o que é **derivado**
dessa medição e o que foi **decidido** por nós. A interface mostra as três lado a lado, com o
grau de evidência da medição de base. Nenhuma afirmação da terceira coluna aparece como se
fosse da primeira.

## Separação entre verdade mecânica e referência moderna

`ephemeris.ts` é a única fonte de posições "reais". É usada em dois lugares e só neles:

1. `validation.ts`, para medir o erro;
2. `panels.tsx`, para mostrar a coluna *Referência* ao lado da coluna *Mecanismo*.

Nenhuma engrenagem, nenhum ponteiro e nenhum calendário lê `ephemeris.ts`. A prova está na
assinatura: `Mechanism.read(jd)` não recebe efeméride nenhuma.

## Como estender

- **Nova roda** — acrescentar a `GEARS` e as arestas a `EDGES`; o solucionador e a validação
  apanham-na automaticamente (`catalogue.total`, `kinematics.meshLaw`, `geometry.overlap`).
- **Nova verificação** — `add({ id, name, category, pass, value, unit, tolerance, detail, grade })`
  dentro de `runValidation`. O relatório markdown e o painel de validação actualizam-se sozinhos.
- **Novo mostrador** — acrescentar a `DIAL_CENTRES`, desenhar a textura em
  `three/geometry.ts`, ligar o ponteiro em `three/scene.ts` e ler a posição em `mechanism.dials`.
- **Outro modelo de calibração** — `new Mechanism(rates, daysPerYear, calibration,
  superiorModel)`; o construtor aceita `'device'` e `'epicycle'` para comparar os dois modelos
  planetários.

## Desempenho

`read()` resolve todas as 69 rodas em ~0,1 ms (propagação linear sobre vectores `Float64Array`;
as taxas racionais são convertidas uma vez, no construtor). A interface actualiza a 15–20 Hz
durante a reprodução; o 3D desenha a 60 Hz com `requestAnimationFrame` e só recebe um novo
`Readout` quando o JD muda.

## Testes

| Ficheiro | Cobre |
| --- | --- |
| `kinematics.test.ts` | catálogo, relações exactas, lei do engrenamento, referenciais móveis |
| `mechanism.test.ts` | determinismo, normalização, simetria temporal, indicadores |
| `calendar.test.ts` | Meton 6940 d, intercalares, Saros, glifos, EYu |
| `geometry.test.ts` | sem colisões, distâncias de engrenamento, caixa, planos |
| `ephemeris.test.ts` | sanidade da referência (equinócios, fase, nodos) |
| `validation.test.ts` | 57/57 verificações, formato do relatório |
| `calibration.test.ts` | o ajuste é reproduzível; as fases não mudam taxas |
