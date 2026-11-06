/**
 * The gear catalogue: the single source of truth for the mechanism's mechanics.
 *
 * 69 gears — 30 surviving in the fragments (a1, b1–b3, c1–c2, d1–d2, e1–e6,
 * f1–f2, g1–g2, h1–h2, i1, k1–k2, l1–l2, m1–m2, o1, the moon-phase contrate
 * gear ma1 and the 63-tooth wheel of Fragment D) and 39 lost gears that the
 * model of Freeth et al. (2021) or a surviving dial requires.
 *
 * Tooth counts for surviving gears come from X-ray CT (Freeth et al. 2006,
 * 2008). Radii, inner radii and thicknesses of the surviving wheels are the
 * measurements of Freeth et al. (2021), Supplementary Table S8. The front
 * gearing (Sun, nodes, Mercury, Venus, Mars, Jupiter, Saturn) follows the
 * reconstruction and the pin-and-slot dimensions of Freeth et al. (2021),
 * Fig. 3–6 and Supplementary Table S9.
 *
 * Nothing here is invented: where the evidence is silent, the grade says so
 * (see sources.ts).
 */

import type { EvidenceGrade } from './sources';

export type TrainId =
  | 'drive'
  | 'moon'
  | 'phase'
  | 'metonic'
  | 'callippic'
  | 'olympiad'
  | 'saros'
  | 'exeligmos'
  | 'sun'
  | 'nodes'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn';

/** Reference frames. 'main' is the fixed case; the others rotate. */
export type Frame = 'main' | 'b1' | 'e3' | 'b3';

export interface Measured {
  outerR: number; // mm, tip radius of the teeth
  innerR: number; // mm, radius of the rim inside the teeth
  pitchR: number; // mm, pitch (primitive) radius
  thickness: number; // mm, plate thickness
}

export interface Gear {
  id: string;
  teeth: number;
  train: TrainId;
  frame: Frame;
  surviving: boolean;
  grade: EvidenceGrade;
  /** Grade of the *function* when it is weaker than the grade of the object. */
  roleGrade?: EvidenceGrade;
  fragment?: 'A' | 'B' | 'C' | 'D';
  contrate?: boolean;
  spokes?: number;
  measured?: Measured;
  role: string;
  evidence: string;
}

const m = (outerR: number, innerR: number, pitchR: number, thickness: number): Measured => ({
  outerR,
  innerR,
  pitchR,
  thickness,
});

const CT = 'Dentes e geometria medidos por tomografia de raios X.';
const LOST_DIAL =
  'Perdida, mas o mostrador que ela aciona sobrevive: a razão é obrigatória e o número de dentes é o da reconstrução consagrada.';
const MODEL_2021 = 'Engrenagem perdida; função descrita nas inscrições, mecanismo reconstruído por Freeth et al. 2021.';

export const GEARS: Gear[] = [
  // ── Acionamento ─────────────────────────────────────────────────────────
  {
    id: 'a1', teeth: 48, train: 'drive', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    contrate: true, role: 'Roda contrate de entrada, no eixo da manivela; engrena no aro de b1.',
    evidence: 'Fragmento A, na borda de b1. Contrate (dentes de coroa), por isso não há raio primitivo tabelado. ' + CT,
  },
  {
    id: 'b1', teeth: 223, train: 'drive', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    spokes: 4, measured: m(65.0, 63.8, 64.4, 2.7),
    role:
      'Roda motriz principal: uma volta por ano. Carrega o Sol médio e, no modelo de 2021, os sistemas epicíclicos do Cosmos em seus quatro raios e pilares.',
    evidence:
      'A grande roda de quatro raios visível na frente do Fragmento A. Os mancais, o bloco perfurado e os tocos de pilar nos raios são a evidência física das engrenagens perdidas à sua frente. Contagem 223 (Freeth et al. 2021, Tabela S8); 224 também já foi proposto. Como só engrena na manivela, a contagem não afeta nenhuma saída.',
  },
  {
    id: 'b2', teeth: 64, train: 'drive', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(15.7, 15.0, 15.3, 2.3),
    role: 'No eixo de b1, atrás da placa principal; aciona o trem lunar (c1) e o calendário (l1).',
    evidence: CT,
  },

  // ── Trem lunar e anomalia ───────────────────────────────────────────────
  {
    id: 'c1', teeth: 38, train: 'moon', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(10.3, 9.4, 9.8, 1.5),
    role: 'Primeiro estágio do trem lunar: 64/38. O fator 19 entra na relação: 38 = 2·19.',
    evidence: CT,
  },
  {
    id: 'c2', teeth: 48, train: 'moon', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(11.0, 10.5, 10.7, 1.3),
    role: 'Segundo estágio: 48/24.', evidence: CT,
  },
  {
    id: 'd1', teeth: 24, train: 'moon', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(5.8, 5.1, 5.4, 2.4),
    role: 'Segundo estágio do trem lunar: 48/24.', evidence: CT,
  },
  {
    id: 'd2', teeth: 127, train: 'moon', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(31.7, 30.6, 31.2, 1.3),
    role: 'Terceiro estágio: 127/32. 127 = 254/2, metade dos meses siderais em 19 anos.',
    evidence: CT + ' Roda parcialmente preservada; a contagem é a que a astronomia exige.',
  },
  {
    id: 'e2', teeth: 32, train: 'moon', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(7.8, 7.1, 7.4, 1.0),
    role: 'Gira na taxa lunar sideral média, 254/19 voltas por ano; mesmo eixo de e5.', evidence: CT,
  },
  {
    id: 'e5', teeth: 50, train: 'moon', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(13.1, 12.2, 12.6, 0.5),
    role: 'Entrada do sistema pino-e-ranhura: engrena em k1, que gira no carretel e3.', evidence: CT,
  },
  {
    id: 'k1', teeth: 50, train: 'moon', frame: 'e3', surviving: true, grade: 'A', fragment: 'A',
    measured: m(13.3, 12.6, 13.0, 0.6),
    role: 'Roda do pino da anomalia lunar: leva um pino que entra na ranhura de k2; montada em e3.',
    evidence:
      'Fragmento A: o pino de k1 e a ranhura de k2 são visíveis na tomografia; os eixos estão separados por cerca de 1,1 mm (Freeth et al. 2006).',
  },
  {
    id: 'k2', teeth: 50, train: 'moon', frame: 'e3', surviving: true, grade: 'A', fragment: 'A',
    measured: m(14.0, 13.1, 13.5, 0.5),
    role: 'Roda de ranhura: acionada pelo pino de k1 em torno de um eixo 1,1 mm distante, gira com velocidade variável.',
    evidence: 'Fragmento A, com a ranhura e sua ponte de sustentação (Freeth et al. 2006).',
  },
  {
    id: 'e6', teeth: 50, train: 'moon', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(13.9, 12.9, 13.4, 0.6),
    role: 'Devolve o movimento lunar variável ao eixo central e.', evidence: CT,
  },
  {
    id: 'e1', teeth: 32, train: 'moon', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(9.7, 8.6, 9.2, 1.3),
    role: 'Último estágio antes do ponteiro da Lua.', evidence: CT,
  },
  {
    id: 'b3', teeth: 32, train: 'moon', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(9.2, 8.3, 8.7, 1.3),
    role: 'Eixo do ponteiro da Lua no zodíaco; carrega a roda contrate do dispositivo de fase lunar.',
    evidence: CT,
  },
  {
    id: 'b0', teeth: 20, train: 'phase', frame: 'main', surviving: false, grade: 'C',
    role: 'Roda do Sol médio, ligada a b1 por uma barra no raio D, para alimentar a fase lunar.',
    evidence: MODEL_2021 + ' A barra e o bloco perfurado no raio D são evidência física indireta.',
  },
  {
    id: 'ma1', teeth: 20, train: 'phase', frame: 'b3', surviving: true, grade: 'A', fragment: 'C',
    contrate: true,
    role: 'Roda contrate que gira no eixo da Lua; o diferencial entre Sol médio e Lua move a esfera de fases.',
    evidence: 'Fragmento C. A roda contrate e o eixo inclinado em relação a b3 sobrevivem.',
  },

  // ── Calendário metônico, olímpico e calíptico ───────────────────────────
  {
    id: 'l1', teeth: 38, train: 'metonic', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(9.0, 8.3, 8.6, 1.5),
    role: 'Primeiro estágio do calendário: 64/38.', evidence: CT,
  },
  {
    id: 'l2', teeth: 53, train: 'metonic', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(13.3, 12.5, 12.9, 1.5),
    role: 'Segundo estágio: 53/96. 53 é primo e reaparece no trem do Saros.', evidence: CT,
  },
  {
    id: 'm1', teeth: 96, train: 'metonic', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(24.7, 23.6, 24.1, 2.0),
    role: 'Roda de 96 dentes no eixo m: alimenta o calendário e, por m3, o Saros.', evidence: CT,
  },
  {
    id: 'm2', teeth: 15, train: 'metonic', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(4.0, 3.7, 3.9, 1.8),
    role: 'Pinhão de 15 dentes no eixo m; aciona n1 (53).', evidence: CT,
  },
  {
    id: 'n1', teeth: 53, train: 'metonic', frame: 'main', surviving: false, grade: 'B',
    role: 'Roda do ponteiro metônico: 5/19 volta por ano, cinco voltas da espiral em 19 anos.',
    evidence: LOST_DIAL,
  },
  {
    id: 'n2', teeth: 57, train: 'olympiad', frame: 'main', surviving: false, grade: 'B',
    role: 'Roda do mostrador olímpico, no eixo n: (57/60)·(5/19) = 1/4 volta por ano.',
    evidence: LOST_DIAL,
  },
  {
    id: 'o1', teeth: 60, train: 'olympiad', frame: 'main', surviving: true, grade: 'A', fragment: 'B',
    measured: m(12.8, 12.2, 12.5, 1.1),
    role: 'Roda de 60 dentes do mostrador olímpico, no Fragmento B.', evidence: CT,
  },
  {
    id: 'n3', teeth: 15, train: 'callippic', frame: 'main', surviving: false, grade: 'B',
    role: 'Pinhão de 15 dentes no eixo n que alimenta o mostrador calíptico.',
    evidence: LOST_DIAL,
  },
  {
    id: 'p1', teeth: 60, train: 'callippic', frame: 'main', surviving: false, grade: 'B',
    role: 'Primeiro estágio calíptico: 60 dentes.', evidence: LOST_DIAL,
  },
  {
    id: 'p2', teeth: 12, train: 'callippic', frame: 'main', surviving: false, grade: 'B',
    role: 'Pinhão de 12 dentes: 12/60.', evidence: LOST_DIAL,
  },
  {
    id: 'q1', teeth: 60, train: 'callippic', frame: 'main', surviving: false, grade: 'B',
    role: 'Roda do ponteiro calíptico: uma volta em 76 anos.',
    evidence: LOST_DIAL + ' O ponteiro e o quadrante de quatro setores estão descritos nas inscrições.',
  },

  // ── Saros e Exeligmos ───────────────────────────────────────────────────
  {
    id: 'm3', teeth: 27, train: 'saros', frame: 'main', surviving: false, grade: 'B',
    role: 'Pinhão de 27 dentes no eixo m que aciona e3 (223). A razão 27/223 é obrigatória.',
    evidence: LOST_DIAL + ' A espiral de 223 divisões sobrevive.',
  },
  {
    id: 'e3', teeth: 223, train: 'saros', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(52.4, 51.5, 51.9, 1.4),
    role: 'Roda de 223 dentes: uma volta por 223 meses sinódicos; carrega o carretel da anomalia lunar.',
    evidence: CT + ' A contagem 223 é confirmada pela escala de 223 divisões do mostrador de Saros.',
  },
  {
    id: 'e4', teeth: 188, train: 'saros', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(49.9, 49.1, 49.5, 1.5),
    role: 'Segundo estágio do Saros: 188/53.', evidence: CT,
  },
  {
    id: 'f1', teeth: 53, train: 'saros', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(13.6, 12.9, 13.2, 1.3),
    role: 'Terceiro estágio do Saros: 53 dentes.', evidence: CT,
  },
  {
    id: 'f2', teeth: 30, train: 'saros', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(8.2, 7.4, 7.8, 1.2),
    role: 'Quarto estágio: 30/54.', evidence: CT,
  },
  {
    id: 'g1', teeth: 54, train: 'saros', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(14.4, 13.4, 13.9, 1.5),
    role: 'Roda do ponteiro de Saros: quatro voltas da espiral em 223 meses.',
    evidence: CT,
  },
  {
    id: 'g2', teeth: 20, train: 'exeligmos', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(4.9, 4.1, 4.5, 1.6),
    role: 'Pinhão de 20 dentes no eixo de g1, entrada do Exeligmos.', evidence: CT,
  },
  {
    id: 'h1', teeth: 60, train: 'exeligmos', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(13.7, 13.0, 13.4, 1.0),
    role: 'Segundo estágio do Exeligmos: 20/60.', evidence: CT,
  },
  {
    id: 'h2', teeth: 15, train: 'exeligmos', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(3.8, 3.0, 3.4, 1.4),
    role: 'Terceiro estágio: 15/60.', evidence: CT,
  },
  {
    id: 'i1', teeth: 60, train: 'exeligmos', frame: 'main', surviving: true, grade: 'A', fragment: 'A',
    measured: m(13.2, 12.6, 12.9, 1.2),
    role: 'Roda do ponteiro de Exeligmos: uma volta em três ciclos de Saros (669 meses).',
    evidence: CT + ' O quadrante de três setores (0, 8, 16 horas) sobrevive no Fragmento A.',
  },

  // ── Linha dos nodos (mão do dragão) ─────────────────────────────────────
  {
    id: 'nodes49', teeth: 49, train: 'nodes', frame: 'main', surviving: false, grade: 'D',
    role: 'Roda fixa de 49 dentes do sistema de nodos, presa à placa circular.',
    evidence: 'Sem evidência física da função. O mancal no raio B é real; a interpretação é hipotética.',
  },
  {
    id: 'nodes62', teeth: 62, train: 'nodes', frame: 'b1', surviving: false, grade: 'D',
    role: 'Primeiro estágio epi cíclico dos nodos: 49/62.', evidence: 'Hipótese de Freeth et al. 2021 (Fig. 5b).',
  },
  {
    id: 'nodes64', teeth: 64, train: 'nodes', frame: 'b1', surviving: false, grade: 'D',
    role: 'Segundo estágio: 64, no mesmo eixo de 62.', evidence: 'Hipótese de Freeth et al. 2021 (Fig. 5b).',
  },
  {
    id: 'nodes48', teeth: 48, train: 'nodes', frame: 'main', surviving: false, grade: 'D',
    role: 'Roda de saída: 1 − (49·64)/(62·48) = −5/93 volta por ano, período de 18,6 anos.',
    evidence: 'Hipótese de Freeth et al. 2021. A mão do dragão de duas pontas não tem evidência direta.',
  },

  // ── Planetas inferiores: Mercúrio e Vênus ───────────────────────────────
  {
    id: 'inf51', teeth: 51, train: 'venus', frame: 'main', surviving: false, grade: 'C',
    role: 'Roda fixa de 51 dentes presa ao Estribo: base comum dos mecanismos de Mercúrio e Vênus.',
    evidence: MODEL_2021 + ' A presença de uma roda fixa é inferida do espaço disponível e da geometria.',
  },
  {
    id: 'merc72', teeth: 72, train: 'mercury', frame: 'b1', surviving: false, grade: 'C',
    role: 'Primeiro estágio de Mercúrio: 51/72.', evidence: MODEL_2021,
  },
  {
    id: 'merc89', teeth: 89, train: 'mercury', frame: 'b1', surviving: false, grade: 'C',
    role: 'Segundo estágio de Mercúrio: 89 dentes no mesmo eixo de 72.', evidence: MODEL_2021,
  },
  {
    id: 'merc40', teeth: 40, train: 'mercury', frame: 'b1', surviving: false, grade: 'C',
    role: 'Terceiro estágio: 89/40 → roda da epíciclo de Mercúrio.', evidence: MODEL_2021,
  },
  {
    id: 'merc20', teeth: 20, train: 'mercury', frame: 'b1', surviving: false, grade: 'C',
    role: 'Roda de 20 dentes; o seguidor de ranhura converte o movimento em longitude verdadeira.',
    evidence: MODEL_2021,
  },
  {
    id: 'ven44', teeth: 44, train: 'venus', frame: 'b1', surviving: false, grade: 'C',
    role: 'Primeiro estágio de Vênus: 51/44.', evidence: MODEL_2021,
  },
  {
    id: 'ven34', teeth: 34, train: 'venus', frame: 'b1', surviving: false, grade: 'C',
    role: 'Segundo estágio: 34 dentes no mesmo eixo de 44.', evidence: MODEL_2021,
  },
  {
    id: 'ven26', teeth: 26, train: 'venus', frame: 'b1', surviving: false, grade: 'C',
    role: 'Roda intermediária (idler) de 26 dentes, que gira na placa D.',
    evidence: MODEL_2021 + ' A placa D do Fragmento D serve de mancal e de espaçador.',
  },
  {
    id: 'r1', teeth: 63, train: 'venus', frame: 'b1', surviving: true, grade: 'A', fragment: 'D', roleGrade: 'C',
    role: 'Roda de 63 dentes do Fragmento D, com disco e pino: o epiciclo de Vênus.',
    evidence:
      'Roda sobrevivente (63 dentes, todos menos três preservados). O disco rebitado é dimensionado para levar o pino na distância que modela a elongação máxima de Vênus; a atribuição a Vênus é interpretação.',
  },

  // ── Sol verdadeiro e planetas superiores (Placa Circular) ───────────────
  {
    id: 'cp56', teeth: 56, train: 'sun', frame: 'main', surviving: false, grade: 'C',
    role: 'Roda fixa de 56 dentes da Placa Circular: referência inercial do excêntrico solar e dos planetas superiores.',
    evidence: MODEL_2021,
  },
  {
    id: 'cp52', teeth: 52, train: 'sun', frame: 'b1', surviving: false, grade: 'C',
    role: 'Roda de 52 dentes que gira no referencial de b1 (56/52) e comanda o excêntrico solar.',
    evidence: MODEL_2021,
  },
  {
    id: 'sun56', teeth: 56, train: 'sun', frame: 'b1', surviving: false, grade: 'C',
    role: 'Roda de 56 dentes do seguidor solar: o pino fixo no espaço produz o excêntrico de Hiparco (e = 1/24).',
    evidence: MODEL_2021 + ' A teoria do Sol excêntrico está descrita no manual do usuário (Freeth & Jones 2012).',
  },
  {
    id: 'mj64', teeth: 64, train: 'jupiter', frame: 'b1', surviving: false, grade: 'C',
    role: 'Roda de 64 dentes (56/64) compartilhada por Marte e Júpiter.', evidence: MODEL_2021,
  },
  {
    id: 'mars38', teeth: 38, train: 'mars', frame: 'b1', surviving: false, grade: 'C',
    role: 'Primeiro estágio de Marte: 56/64 · 38/…', evidence: MODEL_2021,
  },
  {
    id: 'mars40', teeth: 40, train: 'mars', frame: 'b1', surviving: false, grade: 'C',
    role: 'Estágio intermediário de Marte: 38/40.', evidence: MODEL_2021,
  },
  {
    id: 'mars71', teeth: 71, train: 'mars', frame: 'b1', surviving: false, grade: 'C',
    role: 'Roda de 71 dentes: (56/64)·(38/71) = 133/284, o ciclo sinódico de Marte inscrito.',
    evidence: MODEL_2021,
  },
  {
    id: 'mars80s', teeth: 80, train: 'mars', frame: 'b1', surviving: false, grade: 'C',
    role: 'Roda de ranhura do mecanismo indireto de Marte (pino excêntrico).', evidence: MODEL_2021,
  },
  {
    id: 'mars80', teeth: 80, train: 'mars', frame: 'main', surviving: false, grade: 'C',
    role: 'Roda de saída de Marte: 80/80 devolve o movimento ao referencial fixo, com a equação do epiciclo.',
    evidence: MODEL_2021,
  },
  {
    id: 'jup45', teeth: 45, train: 'jupiter', frame: 'b1', surviving: false, grade: 'C',
    role: 'Primeiro estágio de Júpiter: 64/45.', evidence: MODEL_2021,
  },
  {
    id: 'jup40', teeth: 40, train: 'jupiter', frame: 'b1', surviving: false, grade: 'C',
    role: 'Estágio intermediário de Júpiter: 45/40.', evidence: MODEL_2021,
  },
  {
    id: 'jup43', teeth: 43, train: 'jupiter', frame: 'b1', surviving: false, grade: 'C',
    role: 'Roda de 43 dentes: (56/64)·(45/43) = 315/344, o ciclo sinódico de Júpiter.',
    evidence: MODEL_2021,
  },
  {
    id: 'jup65s', teeth: 65, train: 'jupiter', frame: 'b1', surviving: false, grade: 'C',
    role: 'Roda de ranhura de Júpiter.', evidence: MODEL_2021,
  },
  {
    id: 'jup65', teeth: 65, train: 'jupiter', frame: 'main', surviving: false, grade: 'C',
    role: 'Roda de saída de Júpiter: 65/65.', evidence: MODEL_2021,
  },
  {
    id: 'sat61', teeth: 61, train: 'saturn', frame: 'b1', surviving: false, grade: 'C',
    role: 'Primeiro estágio de Saturno: 52/61.', evidence: MODEL_2021,
  },
  {
    id: 'sat40', teeth: 40, train: 'saturn', frame: 'b1', surviving: false, grade: 'C',
    role: 'Estágio intermediário de Saturno: 61/40.', evidence: MODEL_2021,
  },
  {
    id: 'sat68', teeth: 68, train: 'saturn', frame: 'b1', surviving: false, grade: 'C',
    role: 'Roda de 68 dentes: (56/52)·(61/68) = 427/442, o ciclo sinódico inscrito de Saturno.',
    evidence: MODEL_2021 + ' O número 442 está inscrito na capa frontal (seção de Saturno).',
  },
  {
    id: 'sat86s', teeth: 86, train: 'saturn', frame: 'b1', surviving: false, grade: 'C',
    role: 'Roda de ranhura de Saturno.', evidence: MODEL_2021,
  },
  {
    id: 'sat86', teeth: 86, train: 'saturn', frame: 'main', surviving: false, grade: 'C',
    role: 'Roda de saída de Saturno: 86/86.', evidence: MODEL_2021,
  },
];

export const GEAR: ReadonlyMap<string, Gear> = new Map(GEARS.map((g) => [g.id, g]));
export const GEAR_IDS = GEARS.map((g) => g.id);
export const GEAR_INDEX = new Map(GEAR_IDS.map((id, i) => [id, i]));

export const gear = (id: string): Gear => {
  const g = GEAR.get(id);
  if (!g) throw new Error(`engrenagem desconhecida: ${id}`);
  return g;
};

// ── Connections ──────────────────────────────────────────────────────────

export type Edge =
  | { kind: 'mesh'; a: string; b: string; frame: Frame }
  | { kind: 'arbor'; a: string; b: string }
  | { kind: 'fixed'; a: string }
  | { kind: 'pinSlot'; a: string; b: string; frame: Frame; offset: number; pin: number; dir: number };

const mesh = (a: string, b: string, frame: Frame = 'main'): Edge => ({ kind: 'mesh', a, b, frame });
const arbor = (a: string, b: string): Edge => ({ kind: 'arbor', a, b });
const fixed = (a: string): Edge => ({ kind: 'fixed', a });

/**
 * Pin-and-slot dimensions, in millimetres.
 *
 * Lunar anomaly: axis offset 1.1 mm (measured on the CT, Freeth et al. 2006);
 * the pin radius follows from the maximum lunar equation of 6.53°:
 * sin(6.53°) = 1.1 / r  →  r ≈ 9.67 mm.
 *
 * Superior planets: pin distance and axis offset from Freeth et al. 2021,
 * Supplementary Table S9. Their ratio gives the epicyclic equation:
 * Mars asin(6.58/10.0) = 41.1°, Jupiter asin(1.58/8.22) = 11.1°,
 * Saturn asin(1.50/14.37) = 6.0°, i.e. arcsin(R_earth / R_planet).
 */
export const LUNAR_OFFSET_MM = 1.1;
export const LUNAR_MAX_EQUATION_DEG = 6.53;
export const LUNAR_PIN_MM = LUNAR_OFFSET_MM / Math.sin((LUNAR_MAX_EQUATION_DEG * Math.PI) / 180);
export const LUNAR_SLOT_ANGLE = 90; // direction of the slot axis in the carrier, degrees, drawing sense

export const SUPERIOR_PIN_SLOT = {
  mars: { offset: 6.58, pin: 10.0, au: 1.52, angle: -28, cycle: '133/284' },
  jupiter: { offset: 1.58, pin: 8.22, au: 5.2, angle: -150, cycle: '315/344' },
  saturn: { offset: 1.5, pin: 14.37, au: 9.58, angle: 62, cycle: '427/442' },
} as const;

/** Inferior planets: deferent radius (mm) and pin radius of the epicycle wheel. */
export const INFERIOR_FOLLOWER = {
  mercury: { deferent: 36.0, epicycle: 14.04, au: 0.39, cycle: '1513/480' },
  venus: { deferent: 27.8, epicycle: 20.01, au: 0.72, cycle: '289/462' },
} as const;

/** True Sun: Hipparchus' eccentric, e = 1/24, apogee at Gemini 5½°. */
export const SOLAR_ECCENTRICITY = 1 / 24;
export const SOLAR_APOGEE_DEG = 65.5;
export const SUN_FOLLOWER = { deferent: 27.0, eccentric: 27.0 / 24 };

const superiorEdge = (
  a: string,
  b: string,
  p: (typeof SUPERIOR_PIN_SLOT)[keyof typeof SUPERIOR_PIN_SLOT],
): Edge => ({ kind: 'pinSlot', a, b, frame: 'b1', offset: p.offset, pin: p.pin, dir: -p.angle / 360 });

export const EDGES: Edge[] = [
  // Drive: the contrate gear turns b1, and turns itself once per 223/48 years.
  mesh('a1', 'b1'),
  arbor('b1', 'b2'),

  // Lunar train: b2~c1, c2~d1, d2~e2, e5~k1 ⊕ k2~e6, e1~b3
  mesh('b2', 'c1'),
  arbor('c1', 'c2'),
  mesh('c2', 'd1'),
  arbor('d1', 'd2'),
  mesh('d2', 'e2'),
  arbor('e2', 'e5'),
  mesh('e5', 'k1', 'e3'),
  { kind: 'pinSlot', a: 'k1', b: 'k2', frame: 'e3', offset: LUNAR_OFFSET_MM, pin: LUNAR_PIN_MM, dir: -LUNAR_SLOT_ANGLE / 360 },
  mesh('k2', 'e6', 'e3'),
  arbor('e6', 'e1'),
  mesh('e1', 'b3'),

  // Moon phase: b0 rides with the mean Sun, ma1 rides with the Moon pointer.
  arbor('b1', 'b0'),
  mesh('b0', 'ma1', 'b3'),

  // Metonic, Olympiad, Callippic
  mesh('b2', 'l1'),
  arbor('l1', 'l2'),
  mesh('l2', 'm1'),
  arbor('m1', 'm2'),
  mesh('m2', 'n1'),
  arbor('n1', 'n2'),
  arbor('n1', 'n3'),
  mesh('n2', 'o1'),
  mesh('n3', 'p1'),
  arbor('p1', 'p2'),
  mesh('p2', 'q1'),

  // Saros and Exeligmos: m3~e3, e4~f1, f2~g1, g2~h1, h2~i1
  arbor('m1', 'm3'),
  mesh('m3', 'e3'),
  arbor('e3', 'e4'),
  mesh('e4', 'f1'),
  arbor('f1', 'f2'),
  mesh('f2', 'g1'),
  arbor('g1', 'g2'),
  mesh('g2', 'h1'),
  arbor('h1', 'h2'),
  mesh('h2', 'i1'),

  // Lunar nodes: fixed 49 ~ 62 + 64 ~ 48, all carried by b1
  fixed('nodes49'),
  mesh('nodes49', 'nodes62', 'b1'),
  arbor('nodes62', 'nodes64'),
  mesh('nodes64', 'nodes48', 'b1'),

  // Mercury: fixed 51 ~ 72 + 89 ~ 40 ~ 20, with a slotted follower
  fixed('inf51'),
  mesh('inf51', 'merc72', 'b1'),
  arbor('merc72', 'merc89'),
  mesh('merc89', 'merc40', 'b1'),
  mesh('merc40', 'merc20', 'b1'),

  // Venus: 51 ~ 44 + 34 ~ 26 ~ 63, with a slotted follower
  mesh('inf51', 'ven44', 'b1'),
  arbor('ven44', 'ven34'),
  mesh('ven34', 'ven26', 'b1'),
  mesh('ven26', 'r1', 'b1'),

  // True Sun: fixed 56 on the Circular Plate, 52 with b1, 56 on the follower
  fixed('cp56'),
  mesh('cp56', 'cp52', 'b1'),
  mesh('cp52', 'sun56', 'b1'),

  // Saturn: 56~52+61~40~68 ⊕ 86~86
  arbor('cp52', 'sat61'),
  mesh('sat61', 'sat40', 'b1'),
  mesh('sat40', 'sat68', 'b1'),
  superiorEdge('sat68', 'sat86s', SUPERIOR_PIN_SLOT.saturn),
  mesh('sat86s', 'sat86', 'b1'),

  // Jupiter: 56~64+45~40~43 ⊕ 65~65
  mesh('cp56', 'mj64', 'b1'),
  arbor('mj64', 'jup45'),
  mesh('jup45', 'jup40', 'b1'),
  mesh('jup40', 'jup43', 'b1'),
  superiorEdge('jup43', 'jup65s', SUPERIOR_PIN_SLOT.jupiter),
  mesh('jup65s', 'jup65', 'b1'),

  // Mars: 56~64+38~40~71 ⊕ 80~80
  arbor('mj64', 'mars38'),
  mesh('mars38', 'mars40', 'b1'),
  mesh('mars40', 'mars71', 'b1'),
  superiorEdge('mars71', 'mars80s', SUPERIOR_PIN_SLOT.mars),
  mesh('mars80s', 'mars80', 'b1'),
];

export const DRIVER = 'b1';

/** The gear whose rotation defines each moving frame. */
export const FRAME_GEAR: Record<Exclude<Frame, 'main'>, string> = {
  b1: 'b1',
  e3: 'e3',
  b3: 'b3',
};

/** Neighbours of a gear, for the inspector panel. */
export const NEIGHBOURS: ReadonlyMap<string, { id: string; kind: Edge['kind']; note: string }[]> = (() => {
  const map = new Map<string, { id: string; kind: Edge['kind']; note: string }[]>();
  const push = (id: string, other: string, kind: Edge['kind'], note: string) => {
    if (!map.has(id)) map.set(id, []);
    map.get(id)!.push({ id: other, kind, note });
  };
  for (const e of EDGES) {
    if (e.kind === 'fixed') {
      push(e.a, '—', 'fixed', 'fixa ao chassi');
      continue;
    }
    const note =
      e.kind === 'mesh'
        ? `engrena${e.frame === 'main' ? '' : ` (referencial ${e.frame})`}`
        : e.kind === 'arbor'
          ? 'mesmo eixo'
          : `pino-e-ranhura (folga ${e.offset} mm, pino ${e.pin.toFixed(2)} mm)`;
    push(e.a, e.b, e.kind, note);
    push(e.b, e.a, e.kind, note);
  }
  return map;
})();
