/**
 * Provenance of every number the emulator puts on screen.
 *
 * The distinction matters more than it looks. A *measured* fact is something
 * an imaging campaign or a scan read off the artefact. A *derived* fact is
 * arithmetic laid on top of the measured ones — correct if and only if the
 * measured ones are, and always reproducible from tooth counts. A *design
 * choice* is ours: a convention, a calibration, a simplification. Presenting
 * one of the three as another is the standard failure of mechanism
 * reconstructions, so each row names its grade explicitly.
 */

export interface ProvRow {
  /** The claim being made. */
  what: string;
  /** Read off the artefact. */
  measured: string;
  /** Arithmetic over the measured facts. */
  derived: string;
  /** Chosen by us, not by the object. */
  design: string;
  /** A–D evidence grade of the underlying measurement. */
  grade: string;
  /** Where the measurement comes from. */
  source: string;
}

export const PROVENANCE: ProvRow[] = [
  {
    what: 'Contagem de dentes',
    measured: 'Leitura directa das rodas preservadas; 30 das 69 sobrevivem parcial ou totalmente.',
    derived: 'Todas as razões de transmissão são produtos e quocientes destes inteiros — nada é ajustado para “dar certo”.',
    design: 'Nenhum dente inventado numa roda preservada. Onde o número é uma estimativa (grau D), a roda aparece no modelo e na ficha como hipótese.',
    grade: 'A',
    source: 'Freeth et al. 2006, Nature 444; Freeth & Jones 2012, ISAW',
  },
  {
    what: 'Roda motriz b1',
    measured: 'Não sobrevive. O eixo de entrada e a posição da coroa são medidos; os 48 dentes são conjetura.',
    derived: 'Uma volta da manivela = 223/48 meses lunares ≈ 78.60 dias, o que faz a roda b1 ter 48 dentes para 223 do tambor de Saros.',
    design: 'A reconstrução de b1 segue a hipótese mais simples compatível com a caixa e com o eixo; a contagem não é verificável.',
    grade: 'D',
    source: 'Reconstrução cinemática própria a partir das cadeias de Saros',
  },
  {
    what: 'Mês sinódico',
    measured: 'O Saros de 4 voltas (223 meses) é a âncora de todo o calendário do mecanismo.',
    derived: '29.53085 d = 235/19 ÷ 12 · (19/235) exactamente; moderno 29.53059 d, diferença 22 s.',
    design: 'Nada. É a razão que o artefacto impõe.',
    grade: 'A',
    source: 'Cadeias Meton (5/19) e Saros (940/4237)',
  },
  {
    what: 'Ano trópico e calendário egípcio',
    measured: 'Anel zodiacal de 360° e disco de 365 dias, ambos desenhados na placa frontal.',
    derived: '1 ano = 365 d; 1 dia = 360/365,25° do zodíaco após a correcção de 1/4 (raciocínio de Freeth 2008 sobre o pino deslizante).',
    design: 'A fracção de 1/4 é implementada como taxa contínua no eixo da data, não como pino deslizante físico.',
    grade: 'B',
    source: 'Freeth 2008, Nature 454 (eclipse prediction)',
  },
  {
    what: 'Nodos lunares',
    measured: 'Par de rodas com 5 e 93 dentes na cadeia de nodos.',
    derived: '5/93 de volta por mês sinódico → 18.6 anos por revolução; usado no glifo de eclipse.',
    design: 'A montagem dos nodos é dividida em dois módulos (A/B) com 0,9 % de desvio entre eles, para satisfazer a geometria da placa.',
    grade: 'B',
    source: 'Freeth et al. 2006; Carmichael 2021',
  },
  {
    what: 'Posições planetárias',
    measured: 'Mercúrio e Vénus têm trens medidos; Marte, Júpiter e Saturno têm contagens parcialmente inferidas.',
    derived: 'Razões 1513/480 (Mercúrio), 289/462 (Vénus), 133/284 (Marte), 315/344 (Júpiter), 427/442 (Saturno); anomalia sintética modelada por pino-e-ranhura.',
    design: 'Os três planetas externos são a parte menos segura do modelo: o catálogo marca-os grau C e a interface diz-o em cada ficha.',
    grade: 'C',
    source: 'Wright 2006; Freeth & Jones 2012 (contagens em falta marcadas como derivadas)',
  },
  {
    what: 'Disposição 3D das rodas',
    measured: 'Ordem das placas e espessura total (≈ 83 mm) por tomografia; raios de algumas rodas.',
    derived: 'As distâncias entre eixos vêm de módulo × soma de dentes — cada par engrenado fixa a distância, e o solver de layout resolve as restantes.',
    design: 'A altura z de cada roda é uma atribuição nossa dentro do plano medido: um modelo de planos, não uma tomografia roda a roda.',
    grade: 'B (ordem) / D (cota individual)',
    source: 'Freeth et al. 2006 (tomografia); dados de plano em layout.ts',
  },
  {
    what: 'Módulo e escala',
    measured: 'Raio primitivo da roda principal medido ≈ 64,4 mm.',
    derived: 'Módulo único de 1,25 mm aplicado a todas as 30 rodas preservadas dá 0 sobreposições em 30 planos.',
    design: 'O módulo é uma escolha de reconstrução: a escala absoluta do desenho é nossa, a proporção entre rodas é do objecto.',
    grade: 'C',
    source: 'Verificação geométrica em tests/geometry.test.ts',
  },
  {
    what: 'Escalas dos mostradores',
    measured: 'Raios dos anéis gravados: 66,5, 80 e 57 mm no zodíaco e nos sectores.',
    derived: 'As divisões (360°, 12 signos, 365 dias, 19 anos, 223 meses) são repartições exactas destes anéis.',
    design: 'O desenho gráfico dos glifos é nosso; a repartição angular não.',
    grade: 'B',
    source: 'Medições publicadas dos anéis frontais',
  },
  {
    what: 'Época de referência',
    measured: 'O mecanismo estava calibrado para uma data de uso; a data em si é inferida.',
    derived: 'EPOCH_JD 1646679.04084, correspondente a 12 de Maio de 205 a.C. no calendário juliano — escolhida para alinhar o Saros e o Meton num mesmo instante.',
    design: 'É uma convenção de emulação, não um facto arqueológico: rodar o tempo para trás ou para a frente a partir dela é legítimo, datá-la não é.',
    grade: 'C',
    source: 'Convenção interna documentada em time.ts',
  },
  {
    what: 'Calibração das rodas',
    measured: 'As fases de montagem (seis valores entre 0 e 1) não são observáveis.',
    derived: 'São as que minimizam a distância às posições modernas no intervalo 730 d — ajuste reportado em fit.ts.',
    design: 'A calibração é re-ajustada para cada uso: o desvio de 15° de Marte em 250 a.C. é do modelo, não do objecto.',
    grade: 'D',
    source: 'scripts/report.ts, tabela de calibração congelada',
  },
  {
    what: 'Posições no céu (Meeus)',
    measured: 'Nada: a camada de céu não é o mecanismo, é o referencial contra o qual o mecanismo é medido.',
    derived: 'Séries de Meeus truncadas para Sol, Lua e planetas; erro RMS 0,26° (Sol) e 1,07° (Lua) a 730 d.',
    design: 'Referencial geométrico simples (sem perturbações planetárias de alta ordem): a comparação é honesta até aos poucos graus, não aos segundos de arco.',
    grade: 'A (a série) / C (o corte)',
    source: 'Astronomical Algorithms, 2.ª ed., cap. 25 e 47',
  },
  {
    what: 'Horizonte e eclipses locais',
    measured: 'Nada. O mecanismo não tem noção de lugar nem de hora do dia.',
    derived: 'Rotação da Terra (GMST), refracção padrão (−0,8333° Sol) e paralaxe topocêntrica (Meeus §40) aplicadas ao mesmo instante.',
    design: 'Os seis lugares (Siracusa, Rodes, Alexandria, Atenas, Anticítera, Babilónia) são uma escolha de leitura; a obliquidade varia com a época.',
    grade: 'B',
    source: 'Meeus cap. 12, 13, 40; testes em tests/sky.test.ts',
  },
];

/** Cheap headline counts for the summary strip. */
export const PROVENANCE_COUNTS = {
  rows: PROVENANCE.length,
  measured: PROVENANCE.filter((r) => /^A|^B/.test(r.grade)).length,
};
