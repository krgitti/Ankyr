# Matemática do emulador

Todo o cálculo é reproduzível a partir deste documento. As constantes citadas existem com o
mesmo nome no código; os números entre parênteses dão o ficheiro.

## 1. Base de tempo

| Símbolo | Definição | Código |
| --- | --- | --- |
| `EPOCH_JD` | 1646679.04084 — Lua cheia do mês 1 do mostrador de Saros, antes do eclipse de 205 a.C. | `time.ts` |
| `DAYS_PER_YEAR` | 1461/4 = 365.25 d (ano juliano, exacto em `Q`) | `time.ts` |
| `T` | (JD − `EPOCH_JD`) / 365.25 — anos desde a época | `mechanism.yearsAt` |

`T` é devolvido como racional: a conversão JD→T usa `Q.fromNumber` apenas uma vez, no instante
de entrada, e a partir daí todas as taxas são multiplicadas exactamente.

## 2. Lei do engrenamento

Para duas rodas exteriores em contacto, com `Z₁`, `Z₂` dentes:

```
ω₂/ω₁ = −Z₁/Z₂
```

O sinal negativo é a inversão de sentido no contacto. Em `kinematics.ts` a razão é guardada como
racional exacto e propagada pela árvore de acoplamentos; a verificação
`kinematics.meshLaw` recalcula a lei em todos os 39 contactos e compara com a solução do
solucionador, exigindo igualdade racional (tolerância 1e-12).

Trens compostos multiplicam: para uma cadeia de rodas solidárias em eixos comuns,

```
ω_out/ω_in = (−1)^n · ∏ Z_driver / ∏ Z_driven
```

Esta é a forma usada em `validation.ts` (`TRAIN_PRODUCTS`), escrita à mão trem por trem, para
auditar o solucionador por um caminho independente.

## 3. Referenciais móveis (equação de Willis)

Três rodas do mecanismo não giram em torno de um eixo fixo à caixa: as do trem lunar (`k1`,
`k2`) e a do trem de fase (`ma1`) viajam num carreiro, e os trens solares e planetários estão
montados na roda `b1`, que é ela própria um carreiro.

Se a roda `a` engrena `b` num referencial que gira com velocidade angular `ω_c`:

```
ω_b = ω_c − (Z_a/Z_b)·(ω_a − ω_c)
```

Caso particular importante — **roda fixa num carreiro móvel**. Com `ω_a = 0`:

```
ω_b = ω_c·(1 + Z_a/Z_b)
```

Dois exemplos do mecanismo:

| Sistema | Conta | Resultado |
| --- | --- | --- |
| 62 rola no anel fixo de 49, carreiro = `b1` | 1·(1 + 49/62) | `nodes62` = 111/62 |
| 64 engrena o 48 do referencial fixo | 1 − (64/48)·(111/62 − 1) | `nodes48` = **−5/93** |

O segundo resultado é o movimento dos nodos: 5/93 de volta por ano, exactamente a relação
inscrita no mecanismo (a razão −12/223 que a inscrição exige é mecanicamente impossível; 5/93
é a aproximação epicíclica que o instrumento realiza — grau D).

**O Sol.** O anel fixo de 56 dentes (`cp56`), o planeta de 52 (`cp52`) e a roda de 56 do Sol
(`sun56`) dão

```
ω(cp52) = 1 + 56/52 = 108/52
ω(sun56) = 1 − (52/56)·(108/52 − 1) = 1 − (52/56)(56/52) = 0
```

A roda do Sol fica **parada no referencial da caixa**. O ponteiro solar é imóvel e é o anel
zodiacal que gira por trás — o modo como o mostrador frontal funciona. A igualdade é exacta
(racional), não aproximada.

## 4. Pino e ranhura

É o dispositivo que transforma rotação uniforme em movimento não uniforme — a peça central do
mecanismo (anomalia lunar e os cinco planetas).

Geometria: um pino a raio `p` na roda de entrada A; uma ranhura rectilínea na roda de saída B,
cujo eixo está a uma distância `d` do eixo de A, na direcção `δ` do referencial do carreiro.
Com `α` o ângulo da roda A, a posição do pino é

```
P = (p·cos α, p·sin α)
```

e o centro de B é `C = (d·cos δ, d·sin δ)`. A ranhura passa por `C` e pelo pino, portanto a
direcção da ranhura — que é o ângulo de saída `β` — é

```
β = atan2(p·sin α − d·sin δ, p·cos α − d·cos δ)
```

e a transmissão é

```
Δ(α) = wrap(−π,π]( β − α )
```

Implementação: `pinSlotDelta` em `kinematics.ts`. A propagação trata o acoplamento como
`θ_B = θ_A + Δ`, o que preserva a taxa média (Δ é periódico e de média nula) e introduz a
equação.

**Amplitude.** A expansão em série de `Δ` dá

```
Δ(α) ≈ −(d/p)·sin(α − δ) + O((d/p)²)
```

O primeiro harmónico é exactamente a equação do epiciclo. O segundo harmónico não tem
equivalente no epiciclo simples — mas corresponde à *excentricidade da órbita do planeta*, e é
por isso que o dispositivo físico se ajusta melhor à realidade do que a equação ideal.

| Planeta | d/p inscrito | Equação de 1.º harmónico |
| --- | --- | --- |
| Marte | 6.58 / 10.0 = 1/1.52 | ±41.2° |
| Júpiter | 1.58 / 8.22 = 1/5.20 | ±11.1° |
| Saturno | 1.50 / 14.37 = 1/9.58 | ±6.0° |

**Teste que decidiu o modelo.** Substituindo o desvio do dispositivo pelo epiciclo ideal
`asin((d/p)·sin α)` e refazendo o ajuste, o erro de Marte sobe de **4.72° para 17.14°** RMS.
O modelo do dispositivo venceu; está implementado e documentado, com a equivalência de segundo
harmónico explicitada em vez de "corrigida".

## 5. Sistema lunar

```
b3        = 64/38 · 48/24 · 127/32 = 254/19 voltas/ano      → mês sideral 27.3216 d
média     = 254/19 voltas/ano                                → mês sinódico 29.53085 d
anomalia  = pino-e-ranhura entre k1 e k2, carreiro e3         → mês anomalístico 27.5546 d
amplitude = ±6.53°   (moderno ±6.29°)
nodos     = 5/93 voltas/ano                                  → mês draconítico 27.2122 d
```

A Lua é composta vectorialmente como deferente + epiciclo, com o ângulo do epiciclo dado pelo
desvio do pino e o do deferente pela média. O mesmo método é usado nos planetas inferiores.

## 6. Planetas

**Inferiores** (Mercúrio, Vénus) — cinco rodas, seguidor numa ranhura:

```
λ = vecAngle( deferente, θ_deferente,  epiciclo, θ_epiciclo ) + deslocamento
```

com `deferente` 36.0 mm / `epiciclo` 14.04 mm (Mercúrio) e 27.8 / 20.01 (Vénus).

**Superiores** (Marte, Júpiter, Saturno) — sete rodas, pino e ranhura indirecto:

```
λ = θ_roda_de_saída·360° + deslocamento
```

A equação vem inteira do desvio do dispositivo. A amplitude resulta da geometria `d/p` acima,
que é a razão `R_Terra/R_planeta` da teoria heliocêntrica vista do epiciclo.

**Sol** — excêntrico de Hiparco:

```
λ = vecAngle( 27.0, λ_média,  27.0/24,  65.5° + θ_sun56 )
```

Excentricidade e = 1/24, apogeu em Gémeos 5½° (65.5°). A equação máxima é `asin(1/24)` = 2.39°.

**Nodos** — linha dos nodos = 5/93 vol./ano, lida do trem epicíclico de 49/62/64/48.

## 7. Calendários

### Meton
235 meses sinódicos = 19 anos = 6940 dias (Meton de Atenas). Sete anos intercalares
(3, 6, 8, 11, 14, 17, 19) acrescentam um 13.º mês. A espiral tem 5 voltas de 47 células.

### Saros
223 meses sinódicos = 6585⅓ dias, em 4 voltas de espiral. O ponteiro avança 12 células por
ciclo metônico (235 − 223 = 12) — é o comportamento correcto.

### Exeligmo
3 Saros = 669 meses = 48 voltas do ponteiro de Saros. Cada setor acrescenta 8 horas ao
horário do glifo (0 h, +8 h, +16 h), o que corrige o terço de dia do Saros.

### Calíptico
76 anos = 4 ciclos metônicos = 940 meses = 27759 dias (um dia menos que 76 anos julianos).

### Olimpíadas
4 anos por olimpíada; ano 1 = Jogos Olímpicos, ano 3 = Píticos, anos 2 e 4 = Ístmicos e
Nemeus.

## 8. Previsão de eclipses (Freeth 2014)

O modelo EYM ("Eclipse Year Month") indexa cada mês do Saros por uma posição em unidades de
ano de eclipse:

```
EYu(mês) = 38·(mês − 1) mod 446
Lua cheia:  posição = EYu + 17
Lua nova:   posição = EYu + 36
ano de eclipse = 446 EYu = 223 meses
nodo descendente em 66 EYu, ascendente em 289 EYu
```

Regras de previsão:

| Eclipse | Condição |
| --- | --- |
| Lunar | \|distância ao nodo\| ≤ 20 EYu e não consecutivo ao anterior |
| Solar | norte ≤ 20 EYu; sul ≤ 7 EYu |

Cada glifo recebe uma hora: `(18 + 8·(mês − 1)) mod 24`, e a letra grega correspondente à
posição do Sol no céu (as letras de hora sobreviventes no instrumento).

**Verificação.** Contra um efeméride moderno, num ciclo completo: 38/38 eclipses lunares e
28/28 solares confirmados; 75 % dos eclipses reais do período estão previstos. Os que faltam
caem fora dos limites inscritos ou na regra de não-consecutividade — que é do instrumento, não
do emulador.

## 9. Prática numérica

- **Racionais exactos.** `Q` usa `BigInt` para numerador e denominador; `add`, `mul`, `div`
  são exactas. Nenhuma taxa é convertida em `double` durante a resolução.
- **Uma só conversão.** `toNumber()` só é chamado no fim, ao produzir ângulos para o render ou
  para o ecrã.
- **Normalização.** `wrap360` em [0, 360), `wrap(−180, 180]` para diferenças; nunca se compara
  um ângulo com outro sem normalizar a diferença.
- **Erros.** Divisão por zero em `Q` lança; uma roda sem taxa lança com o id; um eixo sem
  posição lança com o id. Nenhum `NaN` silencioso.
- **Conservação.** As fases de montagem e as equações de pino-e-ranhura não alteram a taxa
  média (Δ é periódico de média nula): `tests/calibration.test.ts` verifica que mudar todas as
  fases deixa as taxas racionalmente idênticas.

## 10. Constantes com proveniência

| Constante | Valor | Fonte | Grau |
| --- | --- | --- | --- |
| 254/19 | mês sideral | inscrição + trem de `b3` | A |
| 235/19 | mês sinódico | inscrição metônica | A |
| 223 | meses do Saros | escala sobrevivente | A |
| 5/93 | nodos | derivado do trem 49/62/64/48 | D |
| 1/24 | excentricidade solar | Hiparco, inscrição | A |
| 65.5° | apogeu solar | inscrição (Gémeos 5½°) | A |
| 6.58/10.0 | `d/p` de Marte | Freeth 2021, Table S9 | C |
| 38 EYu/mês | modelo EYM | Freeth 2014 | A |
| 36.0 / 14.04 mm | deferente/epiciclo de Mercúrio | Freeth 2021 | C |

As fases de montagem e os deslocamentos de anel (ver `docs/relatorio-validacao.md`,
secção *Calibração*) são os únicos parâmetros ajustados. São reproduzíveis por
`tests/calibration.test.ts`.
