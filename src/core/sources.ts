/**
 * Sources and the evidence-grading system.
 *
 * Every number in the emulator carries one of four evidence grades, as
 * required by the project protocol: A = archaeologically attested,
 * B = mathematically derived from attested data, C = published scientific
 * reconstruction, D = hypothesis with no direct evidence. Nothing is presented
 * as historical fact without a grade.
 */

export type EvidenceGrade = 'A' | 'B' | 'C' | 'D';

export interface EvidenceClass {
  grade: EvidenceGrade;
  label: string;
  description: string;
  /** Colour used by the UI legend (CSS). */
  color: string;
}

export const EVIDENCE: Record<EvidenceGrade, EvidenceClass> = {
  A: {
    grade: 'A',
    label: 'Atestado',
    description:
      'Preservado fisicamente: roda dentada, escala, inscrição ou referência textual sobrevivente, documentada por tomografia ou epigrafia.',
    color: '#5ad18f',
  },
  B: {
    grade: 'B',
    label: 'Derivado',
    description:
      'Imposto aritmeticamente pelos dados de A (por exemplo, engrenagens perdidas que um mostrador sobrevivente exige, ou números de dentes deduzidos de relações de período inscritas).',
    color: '#5aa9e6',
  },
  C: {
    grade: 'C',
    label: 'Reconstrução',
    description:
      'Proposto por uma reconstrução científica publicada (aqui principalmente Freeth, Higgon e colaboradores, Scientific Reports 11:5821, 2021) e compatível com as evidências, mas não comprovado.',
    color: '#e8b34a',
  },
  D: {
    grade: 'D',
    label: 'Hipótese',
    description:
      'Não há evidência física direta do componente nem da função. Incluído por coerência com o modelo publicado, claramente sinalizado.',
    color: '#d2695b',
  },
};

export interface Source {
  key: SourceKey;
  short: string;
  citation: string;
  doi?: string;
  url?: string;
  openAccess?: boolean;
  /** What the emulator actually takes from this source. */
  usedFor: string;
}

export type SourceKey =
  | 'freeth2021'
  | 'freeth2006'
  | 'freeth2008'
  | 'freeth2014'
  | 'freethJones2012'
  | 'efstathiou2021'
  | 'price1974'
  | 'wright2005'
  | 'carman2012'
  | 'edmunds2011'
  | 'woanBayley2024'
  | 'toomer1984'
  | 'meeus1998'
  | 'standish2006'
  | 'espenakMeeus';

export const SOURCES: Record<SourceKey, Source> = {
  freeth2021: {
    key: 'freeth2021',
    short: 'Freeth et al. 2021',
    citation:
      'Freeth, T., Higgon, D., Dacanalis, A., MacDonald, L., Georgakopoulou, M. & Wojcik, A. A Model of the Cosmos in the ancient Greek Antikythera Mechanism. Scientific Reports 11, 5821 (2021); author correction 11, 17361 (2021).',
    doi: '10.1038/s41598-021-84310-w',
    openAccess: true,
    usedFor:
      'Modelo de 69 engrenagens: mecanismos epicíclicos dos cinco planetas, Sol verdadeiro, fase lunar, linha dos nodos, e a geometria (módulos, distâncias pino-ranhura) dos sistemas do painel frontal.',
  },
  freeth2006: {
    key: 'freeth2006',
    short: 'Freeth et al. 2006',
    citation:
      'Freeth, T., Bitsakis, Y., Moussas, X., et al. Decoding the ancient Greek astronomical calculator known as the Antikythera Mechanism. Nature 444, 587–591 (2006).',
    doi: '10.1038/nature05357',
    usedFor:
      'Contagem de dentes e conexões das 30 engrenagens sobreviventes; roda b1 e o sistema de pino-e-ranhura da anomalia lunar (e5, k1, k2, e3).',
  },
  freeth2008: {
    key: 'freeth2008',
    short: 'Freeth et al. 2008',
    citation:
      'Freeth, T., Jones, A., Steele, J. M. & Bitsakis, Y. Calendars with Olympiad display and eclipse prediction on the Antikythera Mechanism. Nature 454, 614–617 (2008).',
    doi: '10.1038/nature07130',
    usedFor:
      'Escalas do calendário metônico (nomes dos meses, anos intercalares), mostrador olímpico com os jogos, espiral de Saros de 223 meses e o mostrador de Exeligmos.',
  },
  freeth2014: {
    key: 'freeth2014',
    short: 'Freeth 2014',
    citation:
      'Freeth, T. Eclipse prediction on the ancient Greek astronomical calculating machine known as the Antikythera Mechanism. PLoS ONE 9(7), e103275 (2014).',
    doi: '10.1371/journal.pone.0103275',
    openAccess: true,
    usedFor:
      'Modelo do Ano de Eclipse (EYM) usado para gerar os glifos dos 223 meses do mostrador de Saros, e a data de referência (lua cheia 1) de 205 a.C.',
  },
  freethJones2012: {
    key: 'freethJones2012',
    short: 'Freeth & Jones 2012',
    citation:
      'Freeth, T. & Jones, A. The Cosmos in the Antikythera Mechanism. ISAW Papers 4 (2012).',
    url: 'http://dlib.nyu.edu/awdl/isaw/isaw-papers/4/',
    openAccess: true,
    usedFor:
      'Estrutura geral do Cosmos, descrição do manual do usuário e das escalas inscritas do painel frontal.',
  },
  efstathiou2021: {
    key: 'efstathiou2021',
    short: 'Efstathiou et al. 2021',
    citation:
      'Efstathiou, K., Efstathiou, M., Anastasiou, M., Basiakoulis, A. & Efstathiou, M. The Antikythera Mechanism: The Prove of the Accuracy of the Astronomical Calculations Based on It. Heritage 4(4), 3848–3876 (2021).',
    doi: '10.3390/heritage4040211',
    openAccess: true,
    usedFor:
      'Comparação das previsões dos mostradores com efemérides modernas e metodologia de avaliação de erro angular dos ponteiros.',
  },
  price1974: {
    key: 'price1974',
    short: 'Price 1974',
    citation:
      'Price, D. de S. Gears from the Greeks: the Antikythera Mechanism, a calendar computer from ca. 80 B.C. Transactions of the American Philosophical Society 64(7), 1–70 (1974).',
    doi: '10.2307/1006146',
    usedFor: 'Primeira reconstrução completa do trem de engrenagens e da estrutura do estojo (hipóteses parcialmente superadas).',
  },
  wright2005: {
    key: 'wright2005',
    short: 'Wright 2005',
    citation:
      'Wright, M. T. The Antikythera mechanism: a new gearing scheme. Bulletin of the Scientific Instrument Society 85 (2005); Counting months and years: the upper back dial. BSSI 87 (2005).',
    usedFor: 'Identificação da roda de 223 dentes, do tambor diferencial e da espiral de 235 meses.',
  },
  carman2012: {
    key: 'carman2012',
    short: 'Carman, Thorndike & Evans 2012',
    citation:
      'Carman, C. C., Thorndike, A. & Evans, J. On the Pin-and-Slot Device of the Antikythera Mechanism, with a New Application to the Superior Planets. Journal for the History of Astronomy 43(1), 93–116 (2012).',
    doi: '10.1177/002182861204300106',
    usedFor: 'Teoria do dispositivo de pino-e-ranhura para movimentos planetários variáveis (base do mecanismo indireto de 2021).',
  },
  edmunds2011: {
    key: 'edmunds2011',
    short: 'Edmunds 2011',
    citation:
      'Edmunds, M. G. An Initial Assessment of the Accuracy of the Gear Trains in the Antikythera Mechanism. Journal for the History of Astronomy 42(3), 307–320 (2011).',
    doi: '10.1177/002182861104200302',
    usedFor: 'Propagação de erros de fabricação dos dentes até os ponteiros (usado na simulação de Monte Carlo).',
  },
  woanBayley2024: {
    key: 'woanBayley2024',
    short: 'Woan & Bayley 2024',
    citation:
      'Woan, G. & Bayley, J. An improved calendar ring hole-count for the Antikythera mechanism. The Horological Journal (July 2024); arXiv:2403.00040.',
    url: 'https://arxiv.org/abs/2403.00040',
    openAccess: true,
    usedFor:
      'Contagem de 354 furos do anel do calendário (calendário lunar), usada apenas como nota de rodapé crítica: posterior a 2021 e não incorporada ao modelo.',
  },
  toomer1984: {
    key: 'toomer1984',
    short: 'Ptolomeu, Almagesto (Toomer 1984)',
    citation:
      "Toomer, G. J. Ptolemy's Almagest (Duckworth, London, 1984), III.4 e IX–XI.",
    usedFor:
      'Excentricidade solar de Hiparco (1/24, apogeu em Gêmeos 5½°) e as teorias epicíclicas dos planetas que o mecanismo materializa.',
  },
  meeus1998: {
    key: 'meeus1998',
    short: 'Meeus 1998',
    citation: "Meeus, J. Astronomical Algorithms, 2nd ed. (Willmann-Bell, 1998).",
    usedFor:
      'Efeméride moderna independente usada só para validação: longitude solar (cap. 25), teoria lunar truncada (cap. 47) e latitude lunar.',
  },
  standish2006: {
    key: 'standish2006',
    short: 'Standish 2006 (JPL)',
    citation:
      'Standish, E. M. Keplerian Elements for Approximate Positions of the Major Planets. JPL Solar System Dynamics (2006), tabela para 3000 a.C.–3000 d.C.',
    usedFor: 'Posições planetárias heliocêntricas aproximadas para a comparação com as previsões do mecanismo.',
  },
  espenakMeeus: {
    key: 'espenakMeeus',
    short: 'Espenak & Meeus',
    citation:
      'Espenak, F. & Meeus, J. Five Millennium Canon of Solar Eclipses (NASA/TP-2006-214141) e Five Millennium Canon of Lunar Eclipses (NASA/TP-2009-214172).',
    usedFor: 'Limites de latitude lunar para classificar eclipses do Sol e da Lua na validação.',
  },
};

export const SOURCE_LIST = Object.values(SOURCES);
