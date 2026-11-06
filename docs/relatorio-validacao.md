# Relatório de validação científica

Gerado em 2026-11-06T18:14:29.868Z. Época do mecanismo: JD 1646679.04084 (12/5/-204, lua cheia 1 do mostrador de Saros; Freeth 2014).

**57/57 verificações aprovadas (100.0 %).**

## Cinemática

| Verificação | Resultado | Valor | Tolerância | Grau |
| --- | --- | --- | --- | --- |
| Catálogo completo do modelo de 2021 | ✔ | 69.000 engrenagens | = 69 | A |
| Engrenagens atestadas por tomografia | ✔ | 30.000 engrenagens | = 30 | A |
| Lei do engrenamento em todos os contatos | ✔ | 0.000000 voltas/ano | < 1e-12 (exato em Q) | A |
| Todos os mostradores derivam do mesmo eixo de entrada | ✔ | 69.000 engrenagens com taxa definida | = 69 | A |

- **Catálogo completo do modelo de 2021** — 30 sobreviventes nos fragmentos, 39 perdidas e reconstruídas (Freeth et al. 2021, Fig. 6f).
- **Engrenagens atestadas por tomografia** — Fragmento A: 27 rodas; B: o1; C: ma1; D: a roda de 63 dentes.
- **Lei do engrenamento em todos os contatos** — 39 engrenamentos e 1 sistema pino-e-ranhura verificados; pior resíduo em . A solução é exata porque as taxas são racionais.
- **Todos os mostradores derivam do mesmo eixo de entrada** — Cada uma das 69 rodas tem uma taxa resolvida; não existe animação independente do mecanismo.

## Relações de período

| Verificação | Resultado | Valor | Tolerância | Grau |
| --- | --- | --- | --- | --- |
| Relação de transmissão — moon | ✔ | 13.368 voltas/ano | = 254/19 | A |
| Relação de transmissão — metonic | ✔ | 0.263158 voltas/ano | = 5/19 | A |
| Relação de transmissão — saros | ✔ | 0.221855 voltas/ano | = 940/4237 | A |
| Relação de transmissão — exeligmos | ✔ | 0.018488 voltas/ano | = 235/12711 | A |
| Relação de transmissão — olympiad | ✔ | 0.250000 voltas/ano | = 1/4 | A |
| Relação de transmissão — callippic | ✔ | 0.013158 voltas/ano | = 1/76 | A |
| Relação de transmissão — venus | ✔ | 1.626 voltas/ano | = 1 ± 289/462 | A |
| Relação de transmissão — mercury | ✔ | 4.152 voltas/ano | = 1 ± 1513/480 | A |
| Relação de transmissão — mars | ✔ | 1.468 voltas/ano | = 1 ± 133/284 | A |
| Relação de transmissão — jupiter | ✔ | 1.916 voltas/ano | = 1 ± 315/344 | A |
| Relação de transmissão — saturn | ✔ | 1.966 voltas/ano | = 1 ± 427/442 | A |
| Relação de transmissão — nodes | ✔ | 0.053763 voltas/ano | = 98/93 | D |
| Mês sinódico (Meton) | ✔ | 0.000262 dias de erro | < 0.05 d | A |
| Mês sideral (b3) | ✔ | 0.000189 dias de erro | < 0.05 d | A |
| Mês anomalístico (k1 relativo a e3) | ✔ | 0.000660 dias de erro | < 0.05 d | B |
| Mês draconítico (linha dos nodos) | ✔ | 0.000190 dias de erro | < 0.05 d | D |
| Ano de eclipse (223 meses / 19) | ✔ | 0.021140 dias de erro | < 0.05 d | A |

- **Relação de transmissão — moon** — (64/38)·(48/24)·(127/32) = 254/19 meses siderais por ano. Produto manual: 254/19; taxa resolvida pelo sistema: 254/19.
- **Relação de transmissão — metonic** — (64/38)·(53/96)·(15/53) = 5/19 voltas por ano = 235 meses em 19 anos. Produto manual: 5/19; taxa resolvida pelo sistema: -5/19.
- **Relação de transmissão — saros** — (64/38)·(53/96)·(27/223)·(188/53)·(30/54) = 940/4237 voltas por ano = 4 voltas em 223 meses. Produto manual: 940/4237; taxa resolvida pelo sistema: -940/4237.
- **Relação de transmissão — exeligmos** — Saros × (20/60)·(15/60) = uma volta em 669 meses. Produto manual: 235/12711; taxa resolvida pelo sistema: -235/12711.
- **Relação de transmissão — olympiad** — Metônico × 57/60 = 1/4 volta por ano. Produto manual: 1/4; taxa resolvida pelo sistema: 1/4.
- **Relação de transmissão — callippic** — Metônico × (15/60)·(12/60) = 1/76 volta por ano. Produto manual: 1/76; taxa resolvida pelo sistema: -1/76.
- **Relação de transmissão — venus** — (51/44)·(34/63) = 289/462 ciclos sinódicos por ano — o número 462 inscrito. Produto manual: 289/462; taxa resolvida pelo sistema: 751/462.
- **Relação de transmissão — mercury** — (51/72)·(89/40)·(40/20) = 1513/480 ciclos sinódicos por ano. Produto manual: 1513/480; taxa resolvida pelo sistema: 1993/480.
- **Relação de transmissão — mars** — (56/64)·(38/71) = 133/284 ciclos sinódicos por ano. Produto manual: 133/284; taxa resolvida pelo sistema: 417/284.
- **Relação de transmissão — jupiter** — (56/64)·(45/43) = 315/344 ciclos sinódicos por ano. Produto manual: 315/344; taxa resolvida pelo sistema: 659/344.
- **Relação de transmissão — saturn** — (56/52)·(61/68) = 427/442 ciclos sinódicos por ano. Produto manual: 427/442; taxa resolvida pelo sistema: 869/442.
- **Relação de transmissão — nodes** — 1 − (49/62)·(64/48) = −5/93 voltas por ano. Produto manual: 98/93; taxa resolvida pelo sistema: -5/93.
- **Mês sinódico (Meton)** — 235 meses sinódicos em 19 anos: o valor que o calendário metônico impõe. Mecanismo: 29.53085 d; moderno: 29.53059 d.
- **Mês sideral (b3)** — 254 meses siderais em 19 anos (127/32 no trem lunar). Mecanismo: 27.32185 d; moderno: 27.32166 d.
- **Mês anomalístico (k1 relativo a e3)** — Diferença entre o movimento sideral e o movimento das apsides (e3). Mecanismo: 27.55389 d; moderno: 27.55455 d.
- **Mês draconítico (linha dos nodos)** — A linha dos nodos dá uma volta em 5/93 de ano; o mês draconítico é metade do período nodal. Mecanismo: 27.21241 d; moderno: 27.21222 d.
- **Ano de eclipse (223 meses / 19)** — 19 anos de eclipse = 223 meses sinódicos, a identidade em que o mostrador de Saros se baseia. Mecanismo: 346.59894 d; moderno: 346.62008 d.

## Astronomia

| Verificação | Resultado | Valor | Tolerância | Grau |
| --- | --- | --- | --- | --- |
| Ciclo sinódico de mercury | ✔ | 0.001516 % de erro | < 0,2 % | A |
| Período sideral de mercury | ✔ | 0.001378 % de erro | < 0,5 % | B |
| Ciclo sinódico de venus | ✔ | 0.004613 % de erro | < 0,2 % | A |
| Período sideral de venus | ✔ | 0.002845 % de erro | < 0,5 % | B |
| Ciclo sinódico de mars | ✔ | 0.000483 % de erro | < 0,2 % | A |
| Período sideral de mars | ✔ | 0.002873 % de erro | < 0,5 % | B |
| Ciclo sinódico de jupiter | ✔ | 0.001958 % de erro | < 0,2 % | A |
| Período sideral de jupiter | ✔ | 0.000731 % de erro | < 0,5 % | B |
| Ciclo sinódico de saturn | ✔ | 0.002937 % de erro | < 0,2 % | A |
| Período sideral de saturn | ✔ | 0.032344 % de erro | < 0,5 % | B |
| Amplitude da equação lunar pelo pino-e-ranhura | ✔ | 6.530 graus | 6,53° ± 0,05° | A |
| Período anomalístico produzido pelo carretel e3 | ✔ | 27.554 dias | 27.55455 ± 0,01 d | B |
| Longitude de sun contra efeméride moderna | ✔ | 0.655698 graus (RMS) | < 1.2° | C |
| Longitude de moon contra efeméride moderna | ✔ | 4.074 graus (RMS) | < 5.5° | C |
| Longitude de mercury contra efeméride moderna | ✔ | 4.943 graus (RMS) | < 12° | C |
| Longitude de venus contra efeméride moderna | ✔ | 2.641 graus (RMS) | < 5° | C |
| Longitude de mars contra efeméride moderna | ✔ | 15.069 graus (RMS) | < 20° | C |
| Longitude de jupiter contra efeméride moderna | ✔ | 5.484 graus (RMS) | < 8° | C |
| Longitude de saturn contra efeméride moderna | ✔ | 6.444 graus (RMS) | < 9° | C |
| Longitude de nodes contra efeméride moderna | ✔ | 1.006 graus (RMS) | < 2° | C |

- **Ciclo sinódico de mercury** — Relação inscrita 1513/480 → 115.8757 d por ciclo; moderno 115.8775 d. O erro de 1513/480 é o erro do próprio período escolhido pelo mecânico, não do emulador.
- **Período sideral de mercury** — Derivado da relação sinódica: 87.97 d; moderno 87.97 d.
- **Ciclo sinódico de venus** — Relação inscrita 289/462 → 583.8945 d por ciclo; moderno 583.9214 d. O erro de 289/462 é o erro do próprio período escolhido pelo mecânico, não do emulador.
- **Período sideral de venus** — Derivado da relação sinódica: 224.69 d; moderno 224.70 d.
- **Ciclo sinódico de mars** — Relação inscrita 133/284 → 779.9323 d por ciclo; moderno 779.9361 d. O erro de 133/284 é o erro do próprio período escolhido pelo mecânico, não do emulador.
- **Período sideral de mars** — Derivado da relação sinódica: 686.96 d; moderno 686.98 d.
- **Ciclo sinódico de jupiter** — Relação inscrita 315/344 → 398.8762 d por ciclo; moderno 398.8840 d. O erro de 315/344 é o erro do próprio período escolhido pelo mecânico, não do emulador.
- **Período sideral de jupiter** — Derivado da relação sinódica: 4332.62 d; moderno 4332.59 d.
- **Ciclo sinódico de saturn** — Relação inscrita 427/442 → 378.0808 d por ciclo; moderno 378.0919 d. O erro de 427/442 é o erro do próprio período escolhido pelo mecânico, não do emulador.
- **Período sideral de saturn** — Derivado da relação sinódica: 10762.70 d; moderno 10759.22 d.
- **Amplitude da equação lunar pelo pino-e-ranhura** — arcsin(1,1 mm / 9,67 mm) = 6,53°, o máximo da equação do centro da Lua usado no mecanismo.
- **Período anomalístico produzido pelo carretel e3** — O carretel e3 gira a 8.883 anos por volta (período das apsides); k1 menos e3 dá 27.5539 d.
- **Longitude de sun contra efeméride moderna** — 200 anos (250–50 a.C.), 3653 amostras: viés 0.41°, RMS 0.66°, máximo 1.54°. Inclui o erro da própria teoria helenística, não só o do emulador.
- **Longitude de moon contra efeméride moderna** — 200 anos (250–50 a.C.), 3653 amostras: viés 2.70°, RMS 4.07°, máximo 9.96°. Inclui o erro da própria teoria helenística, não só o do emulador.
- **Longitude de mercury contra efeméride moderna** — 200 anos (250–50 a.C.), 3653 amostras: viés 2.41°, RMS 4.94°, máximo 15.20°. Inclui o erro da própria teoria helenística, não só o do emulador.
- **Longitude de venus contra efeméride moderna** — 200 anos (250–50 a.C.), 3653 amostras: viés 0.79°, RMS 2.64°, máximo 16.35°. Inclui o erro da própria teoria helenística, não só o do emulador.
- **Longitude de mars contra efeméride moderna** — 200 anos (250–50 a.C.), 3653 amostras: viés 7.07°, RMS 15.07°, máximo 64.22°. Inclui o erro da própria teoria helenística, não só o do emulador.
- **Longitude de jupiter contra efeméride moderna** — 200 anos (250–50 a.C.), 3653 amostras: viés 3.95°, RMS 5.48°, máximo 12.46°. Inclui o erro da própria teoria helenística, não só o do emulador.
- **Longitude de saturn contra efeméride moderna** — 200 anos (250–50 a.C.), 3653 amostras: viés 3.75°, RMS 6.44°, máximo 14.09°. Inclui o erro da própria teoria helenística, não só o do emulador.
- **Longitude de nodes contra efeméride moderna** — 200 anos (250–50 a.C.), 3653 amostras: viés 0.69°, RMS 1.01°, máximo 1.96°. Inclui o erro da própria teoria helenística, não só o do emulador.

## Calendários

| Verificação | Resultado | Valor | Tolerância | Grau |
| --- | --- | --- | --- | --- |
| Ciclo metônico completo | ✔ | 235.000 meses | 235 meses / 6940 dias | A |
| Duração dos meses nas faixas 29/30 | ✔ | 2.000 valores distintos | = 2 (29 e 30) | B |
| 235 meses = 19 anos exatos na engrenagem | ✔ | 0.000000 voltas | < 1e-12 | A |
| 223 meses = 4 voltas de Saros | ✔ | 12.368 meses sinódicos por ano | = 235/19 | A |
| Calíptico: 76 anos por volta | ✔ | 76.000 anos por volta | = 76 | A |
| Olímpico: quatro anos por volta | ✔ | 4.000 anos por volta | = 4 | A |
| Ponteiro metônico acompanha o trem de engrenagens | ✔ | 0.000000 meses | < 1e-3 | A |

- **Ciclo metônico completo** — 235 meses, 6940 dias, 125 meses cheios de 30 dias e 110 de 29. Intercalares nos anos 3, 6, 8, 11, 14, 17, 19 do ciclo.
- **Duração dos meses nas faixas 29/30** — Nenhum mês fora das durações lunares de 29 ou 30 dias.
- **235 meses = 19 anos exatos na engrenagem** — n1 dá 5 voltas (5 × 47 meses) em exatamente 19 anos de mecanismo: a espiral fecha.
- **223 meses = 4 voltas de Saros** — Quatro voltas da espiral cobrem 223 meses, e |g1|·223/4 = 235/19 exatamente: o mostrador de Saros e o metônico são a mesma contagem de meses vista por duas escalas.
- **Calíptico: 76 anos por volta** — q1 fecha 76 anos em uma volta; quatro ciclos metônicos menos um dia.
- **Olímpico: quatro anos por volta** — o1 dá uma volta por Olimpíada, como a inscrição exige.
- **Ponteiro metônico acompanha o trem de engrenagens** — A posição do ponteiro é lida da engrenagem n1, não de uma animação independente.

## Geometria

| Verificação | Resultado | Valor | Tolerância | Grau |
| --- | --- | --- | --- | --- |
| Distância entre eixos = soma dos raios primitivos | ✔ | 0.000000 mm | < 1e-6 mm | B |
| Rodas no mesmo eixo ocupam planos distintos | ✔ | 0.000000 conflitos | = 0 | B |
| Nenhuma colisão entre rodas do mesmo plano | ✔ | 0.000000 colisões | = 0 | B |
| Roda motriz dentro do estojo | ✔ | 64.400 mm de raio primitivo | estojo 78 × 108 × 34 mm | A |

- **Distância entre eixos = soma dos raios primitivos** — Todos os eixos foram construídos por interseção de círculos com esses raios; pior desvio em c2~d1.
- **Rodas no mesmo eixo ocupam planos distintos** — 47 eixos, 30 planos de engrenamento resolvidos por coloração de grafos.
- **Nenhuma colisão entre rodas do mesmo plano** — Verificadas todas as rodas coplanares e não acopladas.
- **Roda motriz dentro do estojo** — b1 tem 64,4 mm de raio primitivo, cabendo no estojo reconstruído (Freeth et al. 2021, Fig. 6).

## Eclipses

| Verificação | Resultado | Valor | Tolerância | Grau |
| --- | --- | --- | --- | --- |
| Precisão dos glifos de eclipse | ✔ | 100.000 % dos glifos confirmados | > 85 % | C |
| Cobertura dos eclipses reais | ✔ | 75.000 % dos eclipses reais previstos | > 60 % | C |
| Consistência aritmética do Modelo do Ano de Eclipse | ✔ | 8474.000 EYu por ciclo | = 446 × 19 | A |

- **Precisão dos glifos de eclipse** — 38 luas e 28 sóis previstos no ciclo de 223 meses; 66 correspondem a eclipses reais (penumbrais incluídos).
- **Cobertura dos eclipses reais** — No mesmo período ocorreram 44 eclipses da Lua e 44 do Sol; o esquema marca 66. Eclipses não marcados: 6 lunares, 16 solares.
- **Consistência aritmética do Modelo do Ano de Eclipse** — 223 meses × 38 EYu = 19 anos de eclipse × 446 EYu: o esquema fecha exatamente, sem arredondamento.

## Precisão

| Verificação | Resultado | Valor | Tolerância | Grau |
| --- | --- | --- | --- | --- |
| Precisão após 100 000 anos simulados | ✔ | 0.000003 graus de desvio | < 1e-4° | A |
| Determinismo da solução cinemática | ✔ | 0.000000 divergências | = 0 | A |

- **Precisão após 100 000 anos simulados** — Ângulo exato: 37.894737°; acumulação ingênua em ponto flutuante: 37.893753°. O emulador usa frações exatas e nunca acumula erro.
- **Determinismo da solução cinemática** — A solução é recomputada a cada instância e coincide bit a bit (racionais sobre BigInt).

## Divergência astronômica (250–50 a.C.)

| Corpo | Viés (°) | RMS (°) | Máximo (°) | Amostras |
| --- | --- | --- | --- | --- |
| sun | 0.41 | 0.66 | 1.54 | 3653 |
| moon | 2.70 | 4.07 | 9.96 | 3653 |
| mercury | 2.41 | 4.94 | 15.20 | 3653 |
| venus | 0.79 | 2.64 | 16.35 | 3653 |
| mars | 7.07 | 15.07 | 64.22 | 3653 |
| jupiter | 3.95 | 5.48 | 12.46 | 3653 |
| saturn | 3.75 | 6.44 | 14.09 | 3653 |
| nodes | 0.69 | 1.01 | 1.96 | 3653 |

## Esquema de eclipses

- Glifos lunares: 38, dos quais 38 correspondem a eclipses reais; 44 eclipses lunares ocorreram no período.
- Glifos solares: 28, dos quais 28 correspondem a eclipses reais; 44 eclipses solares ocorreram.
- Precisão 100.0 %, cobertura 75.0 %.


## Produtos de dentes independentes

Cada relação de período é recalculada multiplicando à mão as razões de dentes da cadeia.
Se o produto e o solucionador concordarem, a taxa resolvida é confiável.

| trem | cadeia | produto exacto | significado |
| --- | --- | --- | --- |
| moon | b3 | 254/19 | (64/38)·(48/24)·(127/32) = 254/19 meses siderais por ano |
| metonic | n1 | 5/19 | (64/38)·(53/96)·(15/53) = 5/19 voltas por ano = 235 meses em 19 anos |
| saros | g1 | 940/4237 | (64/38)·(53/96)·(27/223)·(188/53)·(30/54) = 940/4237 voltas por ano = 4 voltas em 223 meses |
| exeligmos | i1 | 235/12711 | Saros × (20/60)·(15/60) = uma volta em 669 meses |
| olympiad | o1 | 1/4 | Metônico × 57/60 = 1/4 volta por ano |
| callippic | q1 | 1/76 | Metônico × (15/60)·(12/60) = 1/76 volta por ano |
| venus | r1 | 289/462 | (51/44)·(34/63) = 289/462 ciclos sinódicos por ano — o número 462 inscrito |
| mercury | merc20 | 1513/480 | (51/72)·(89/40)·(40/20) = 1513/480 ciclos sinódicos por ano |
| mars | mars71 | 133/284 | (56/64)·(38/71) = 133/284 ciclos sinódicos por ano |
| jupiter | jup43 | 315/344 | (56/64)·(45/43) = 315/344 ciclos sinódicos por ano |
| saturn | sat68 | 427/442 | (56/52)·(61/68) = 427/442 ciclos sinódicos por ano |
| nodes | nodes48 | 98/93 | 1 − (49/62)·(64/48) = −5/93 voltas por ano |

## Calibração

Os únicos parâmetros ajustados do mecanismo. Fases de montagem e deslocamentos de anel,
filtrados pela montagem física; nenhuma taxa depende deles.

| parâmetro | valor |
| --- | --- |
| fase k1 | 0.224449282787 voltas |
| fase merc20 | 0.813908811475 voltas |
| fase r1 | 0.629290471311 voltas |
| fase mars71 | 0.363601434426 voltas |
| fase jup43 | 0.796170594262 voltas |
| fase sat68 | 0.190701844262 voltas |
| deslocamento sun | 46.605757711222° |
| deslocamento moon | 143.670202620853° |
| deslocamento mercury | 147.456237132700° |
| deslocamento venus | 306.228070263571° |
| deslocamento mars | 246.902519028405° |
| deslocamento jupiter | 17.795162032061° |
| deslocamento saturn | 162.228225775181° |
| deslocamento nodes | 266.708905980602° |

## Fontes

- **Freeth et al. 2021** — Freeth, T., Higgon, D., Dacanalis, A., MacDonald, L., Georgakopoulou, M. & Wojcik, A. A Model of the Cosmos in the ancient Greek Antikythera Mechanism. Scientific Reports 11, 5821 (2021); author correction 11, 17361 (2021). doi:10.1038/s41598-021-84310-w
- **Freeth et al. 2006** — Freeth, T., Bitsakis, Y., Moussas, X., et al. Decoding the ancient Greek astronomical calculator known as the Antikythera Mechanism. Nature 444, 587–591 (2006). doi:10.1038/nature05357
- **Freeth et al. 2008** — Freeth, T., Jones, A., Steele, J. M. & Bitsakis, Y. Calendars with Olympiad display and eclipse prediction on the Antikythera Mechanism. Nature 454, 614–617 (2008). doi:10.1038/nature07130
- **Freeth 2014** — Freeth, T. Eclipse prediction on the ancient Greek astronomical calculating machine known as the Antikythera Mechanism. PLoS ONE 9(7), e103275 (2014). doi:10.1371/journal.pone.0103275
- **Freeth & Jones 2012** — Freeth, T. & Jones, A. The Cosmos in the Antikythera Mechanism. ISAW Papers 4 (2012).
- **Efstathiou et al. 2021** — Efstathiou, K., Efstathiou, M., Anastasiou, M., Basiakoulis, A. & Efstathiou, M. The Antikythera Mechanism: The Prove of the Accuracy of the Astronomical Calculations Based on It. Heritage 4(4), 3848–3876 (2021). doi:10.3390/heritage4040211
- **Price 1974** — Price, D. de S. Gears from the Greeks: the Antikythera Mechanism, a calendar computer from ca. 80 B.C. Transactions of the American Philosophical Society 64(7), 1–70 (1974). doi:10.2307/1006146
- **Wright 2005** — Wright, M. T. The Antikythera mechanism: a new gearing scheme. Bulletin of the Scientific Instrument Society 85 (2005); Counting months and years: the upper back dial. BSSI 87 (2005).
- **Carman, Thorndike & Evans 2012** — Carman, C. C., Thorndike, A. & Evans, J. On the Pin-and-Slot Device of the Antikythera Mechanism, with a New Application to the Superior Planets. Journal for the History of Astronomy 43(1), 93–116 (2012). doi:10.1177/002182861204300106
- **Edmunds 2011** — Edmunds, M. G. An Initial Assessment of the Accuracy of the Gear Trains in the Antikythera Mechanism. Journal for the History of Astronomy 42(3), 307–320 (2011). doi:10.1177/002182861104200302
- **Woan & Bayley 2024** — Woan, G. & Bayley, J. An improved calendar ring hole-count for the Antikythera mechanism. The Horological Journal (July 2024); arXiv:2403.00040.
- **Ptolomeu, Almagesto (Toomer 1984)** — Toomer, G. J. Ptolemy's Almagest (Duckworth, London, 1984), III.4 e IX–XI.
- **Meeus 1998** — Meeus, J. Astronomical Algorithms, 2nd ed. (Willmann-Bell, 1998).
- **Standish 2006 (JPL)** — Standish, E. M. Keplerian Elements for Approximate Positions of the Major Planets. JPL Solar System Dynamics (2006), tabela para 3000 a.C.–3000 d.C.
- **Espenak & Meeus** — Espenak, F. & Meeus, J. Five Millennium Canon of Solar Eclipses (NASA/TP-2006-214141) e Five Millennium Canon of Lunar Eclipses (NASA/TP-2009-214172).