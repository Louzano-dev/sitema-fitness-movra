import { muscles, type Slot } from './training-models';

// A planning role describes how a movement can be used. Similar implements share one
// family so that switching from barbell to dumbbell does not fill an extra slot.
type Entry = [Slot, string, number, string[], string?];
const entries: Entry[] = [
  ['joelho','Agachamento',1,['agachamento-corporal','ex-agachamento-goblet','ex-agachamento-sumo-com-peso-corporal']],
  ['joelho','Agachamento',3,['agachamento','ex-agachamento-frontal']],
  ['joelho','Leg press',1,['legpress','ex-leg-press-horizontal']],
  ['joelho','Afundo',2,['afundo','ex-afundo-com-halteres','ex-avanco-reverso','ex-afundo-estatico']],
  ['joelho','Extensão de joelho',1,['extensora','ex-cadeira-extensora-unilateral']],
  ['quadril','Ponte',1,['ponte','ex-ponte-de-gluteos-com-elastico','ex-ponte-de-gluteos-com-halter']],
  ['quadril','Ponte',2,['ex-ponte-de-gluteos-unilateral','ex-elevacao-pelvica-com-barra']],
  ['quadril','Dobradiça de quadril',1,['terra-kettlebell']],
  ['quadril','Dobradiça de quadril',2,['ex-levantamento-terra-romeno-com-halteres','ex-levantamento-terra-com-halteres'],'Posteriores de coxa'],
  ['quadril','Dobradiça de quadril',3,['ex-levantamento-terra-romeno-com-barra','ex-levantamento-terra-convencional'],'Posteriores de coxa'],
  ['quadril','Abdução de quadril',1,['ex-cadeira-abdutora','ex-abducao-de-quadril-deitada','ex-abducao-de-quadril-com-elastico']],
  ['posterior','Flexão de joelho',1,['ex-mesa-flexora','ex-cadeira-flexora','ex-flexora-em-pe']],
  ['peito','Supino horizontal',1,['ex-supino-na-maquina','supino','ex-supino-convergente']],
  ['peito','Supino horizontal',2,['ex-supino-reto-com-barra']],
  ['peito','Supino inclinado',2,['ex-supino-inclinado-com-halteres','ex-supino-inclinado-com-barra','ex-supino-inclinado-na-maquina']],
  ['peito','Flexão de braços',1,['ex-flexao-de-bracos-com-joelhos-apoiados']],
  ['peito','Flexão de braços',2,['flexao']],
  ['peito','Adução horizontal',1,['ex-peck-deck','ex-crucifixo-na-maquina']],
  ['peito','Adução horizontal',2,['ex-crucifixo-reto-com-halteres','ex-crossover-na-polia-alta']],
  ['costas','Remada',1,['remada','remada-elastico','ex-remada-articulada','ex-remada-sentada-com-elastico']],
  ['costas','Remada',2,['remada-halter','ex-remada-com-peito-apoiado','ex-remada-bilateral-com-halteres']],
  ['costas','Remada',3,['ex-remada-curvada-com-barra']],
  ['costas','Puxada vertical',1,['ex-puxada-frontal-neutra','ex-puxada-na-maquina']],
  ['costas','Puxada vertical',2,['ex-puxada-frontal-aberta','ex-puxada-frontal-supinada']],
  ['costas','Extensão de ombro',2,['ex-pulldown-com-bracos-estendidos','ex-pullover-no-banco']],
  ['ombros','Elevação lateral',1,['elevacao','ex-elevacao-lateral-na-maquina','ex-elevacao-lateral-com-elastico']],
  ['ombros','Elevação lateral',2,['ex-elevacao-lateral-na-polia']],
  ['ombros','Desenvolvimento',1,['ex-desenvolvimento-na-maquina']],
  ['ombros','Desenvolvimento',2,['desenvolvimento','ex-desenvolvimento-com-elastico']],
  ['ombros','Crucifixo inverso',2,['ex-crucifixo-inverso-na-maquina','ex-crucifixo-inverso-com-halteres']],
  ['bíceps','Rosca supinada',1,['rosca','ex-rosca-direta-na-polia','ex-rosca-direta-com-elastico']],
  ['bíceps','Rosca neutra',1,['ex-rosca-martelo','ex-rosca-martelo-na-polia']],
  ['tríceps','Extensão de cotovelo',1,['triceps','ex-triceps-unilateral-na-polia','ex-triceps-com-elastico']],
  ['tríceps','Extensão acima da cabeça',2,['ex-triceps-frances-com-halter','ex-triceps-acima-da-cabeca-com-elastico']],
  ['panturrilha','Flexão plantar em pé',1,['panturrilha','ex-elevacao-de-panturrilha-com-halteres','ex-panturrilha-em-pe-na-maquina']],
  ['panturrilha','Flexão plantar sentada',1,['ex-panturrilha-sentada-na-maquina','ex-panturrilha-sentada-com-halter']],
  ['core','Flexão de tronco',1,['abdominal','ex-abdominal-curto']],
  ['core','Estabilização alternada',1,['ex-dead-bug','ex-bird-dog']],
  ['core','Antirrotação',2,['ex-pallof-press','ex-pallof-press-ajoelhado']],
  ['core','Flexão pélvica',2,['ex-abdominal-reverso']],
  ['mobilidade','Mobilidade de quadril',1,['mobilidade-quadril','ex-circulos-de-quadril']],
  ['mobilidade','Mobilidade de ombro',1,['mobilidade-ombro','ex-circulos-de-ombros']],
  ['mobilidade','Mobilidade de tornozelo',1,['ex-mobilidade-de-tornozelo-na-parede']],
  ['mobilidade','Rotação torácica',1,['ex-rotacao-toracica-deitada','ex-rotacao-toracica-em-quatro-apoios']],
  ['mobilidade','Mobilidade de coluna',1,['ex-gato-e-camelo']],
  ['mobilidade','Mobilidade de punho',1,['ex-mobilidade-de-punhos']],
];
const assistance: Record<string, string[]> = {
  'Agachamento':['Glúteos','Core'], 'Leg press':['Glúteos'], Afundo:['Glúteos','Core'],
  Ponte:['Posteriores de coxa'], 'Dobradiça de quadril':['Glúteos','Posteriores de coxa','Core'],
  'Supino horizontal':['Tríceps','Ombros'], 'Supino inclinado':['Tríceps','Ombros'],
  'Flexão de braços':['Tríceps','Ombros','Core'], Remada:['Bíceps','Ombros'],
  'Puxada vertical':['Bíceps'], Desenvolvimento:['Tríceps'],
};
const aliases: Record<string,string[]> = {
  'Dobradiça de quadril':['hip hinge'], 'Flexão de braços':['push-up'],
  'Supino horizontal':['chest press'], Remada:['row'], 'Adução horizontal':['fly'],
  'Agachamento':['squat'], 'Afundo':['lunge'], Ponte:['glute bridge'],
};
export const planningById = new Map(entries.flatMap(([slot,family,tier,ids,primary = muscles[slot]]) =>
  ids.map((id) => [id, {
    slot, family, tier, primary,
    secondary:(assistance[family] ?? []).filter((g) => g !== primary),
    compound: family in assistance,
    synonyms: aliases[family] ?? [], reviewStatus:'Aguardando revisão profissional',
  }] as const),
));
