import type { CatalogExercise } from './exercise-catalog';
// Named variations, not an exhaustive list of all possible human movements.
const groups: {
  muscle: string;
  group: string;
  pattern: string;
  equipment: string;
  requires: string[];
  names: string[];
}[] = [];
function add(
  muscle: string,
  group: string,
  pattern: string,
  equipment: string,
  requires: string[],
  names: string,
) {
  groups.push({ muscle, group, pattern, equipment, requires, names: names.split('|') });
}
const upper = 'Membros superiores',
  lower = 'Membros inferiores';
add(
  'Peitoral',
  upper,
  'Empurrar',
  'Barra',
  ['Barra e anilhas', 'Banco'],
  'Supino reto com barra|Supino inclinado com barra|Supino declinado com barra|Supino com pegada fechada|Supino no chão com barra',
);
add(
  'Peitoral',
  upper,
  'Empurrar',
  'Halteres',
  ['Halteres', 'Banco'],
  'Supino reto com halteres|Supino inclinado com halteres|Supino declinado com halteres|Supino com pegada neutra|Supino unilateral com halter|Crucifixo reto com halteres|Crucifixo inclinado com halteres|Crucifixo declinado com halteres|Pullover com halter',
);
add(
  'Peitoral',
  upper,
  'Empurrar',
  'Máquina',
  ['Máquinas'],
  'Supino na máquina|Supino inclinado na máquina|Supino convergente|Peck deck|Crucifixo na máquina|Supino no Smith',
);
add(
  'Peitoral',
  upper,
  'Empurrar',
  'Polia',
  ['Polias'],
  'Crossover na polia alta|Crossover na polia baixa|Crucifixo na polia média|Supino em pé na polia|Crucifixo unilateral na polia',
);
add(
  'Peitoral',
  upper,
  'Empurrar',
  'Peso corporal',
  ['Peso corporal'],
  'Flexão de braços com joelhos apoiados|Flexão de braços inclinada|Flexão de braços declinada|Flexão de braços com pegada fechada|Flexão de braços com apoio alternado|Flexão de braços com mãos afastadas|Flexão escapular',
);
add(
  'Dorsais',
  upper,
  'Puxar',
  'Barra',
  ['Barra e anilhas'],
  'Remada curvada com barra|Remada curvada supinada|Remada Pendlay|Remada cavalinho|Pullover com barra',
);
add(
  'Dorsais',
  upper,
  'Puxar',
  'Halteres',
  ['Halteres'],
  'Remada unilateral com halter|Remada bilateral com halteres|Remada com halteres e pegada neutra|Remada com halteres e pegada pronada|Remada renegada',
);
add(
  'Dorsais',
  upper,
  'Puxar',
  'Halteres',
  ['Halteres', 'Banco'],
  'Remada com peito apoiado|Remada no banco inclinado|Pullover no banco',
);
add(
  'Dorsais',
  upper,
  'Puxar',
  'Polia',
  ['Polias'],
  'Puxada frontal aberta|Puxada frontal neutra|Puxada frontal supinada|Puxada unilateral na polia|Remada baixa com triângulo|Remada baixa aberta|Remada baixa unilateral|Remada alta na polia|Pulldown com braços estendidos|Pulldown unilateral|Face pull',
);
add(
  'Dorsais',
  upper,
  'Puxar',
  'Máquina',
  ['Máquinas'],
  'Remada articulada|Remada na máquina com peito apoiado|Puxada na máquina|Barra fixa assistida|Remada unilateral na máquina',
);
add(
  'Dorsais',
  upper,
  'Puxar',
  'Elástico',
  ['Elásticos'],
  'Puxada com elástico|Remada sentada com elástico|Remada em pé com elástico|Pulldown com elástico|Abertura de elástico',
);
add(
  'Ombros',
  upper,
  'Elevar',
  'Halteres',
  ['Halteres'],
  'Elevação lateral com halteres|Elevação frontal com halteres|Elevação frontal alternada|Elevação lateral unilateral|Elevação lateral inclinada|Crucifixo inverso com halteres|Desenvolvimento Arnold|Desenvolvimento unilateral com halter|Desenvolvimento com pegada neutra|Remada alta com halteres|Encolhimento com halteres',
);
add(
  'Ombros',
  upper,
  'Empurrar',
  'Barra',
  ['Barra e anilhas'],
  'Desenvolvimento militar com barra|Desenvolvimento frontal com barra|Push press com barra',
);
add(
  'Ombros',
  upper,
  'Elevar',
  'Polia',
  ['Polias'],
  'Elevação lateral na polia|Elevação frontal na polia|Crucifixo inverso na polia|Rotação externa na polia|Rotação interna na polia|Remada alta na polia com corda',
);
add(
  'Ombros',
  upper,
  'Elevar',
  'Máquina',
  ['Máquinas'],
  'Elevação lateral na máquina|Desenvolvimento na máquina|Crucifixo inverso na máquina|Encolhimento na máquina',
);
add(
  'Ombros',
  upper,
  'Elevar',
  'Elástico',
  ['Elásticos'],
  'Elevação lateral com elástico|Elevação frontal com elástico|Rotação externa com elástico|Rotação interna com elástico|Desenvolvimento com elástico',
);
add(
  'Bíceps',
  upper,
  'Flexão de cotovelo',
  'Halteres',
  ['Halteres'],
  'Rosca direta com halteres|Rosca alternada|Rosca martelo|Rosca martelo cruzada|Rosca concentrada|Rosca Zottman|Rosca unilateral em pé',
);
add(
  'Bíceps',
  upper,
  'Flexão de cotovelo',
  'Halteres',
  ['Halteres', 'Banco'],
  'Rosca inclinada com halteres|Rosca Scott com halter|Rosca spider com halteres|Rosca apoiada no banco',
);
add(
  'Bíceps',
  upper,
  'Flexão de cotovelo',
  'Barra',
  ['Barra e anilhas'],
  'Rosca direta com barra reta|Rosca direta com barra W|Rosca inversa com barra|Rosca arrastada|Rosca Scott com barra W',
);
add(
  'Bíceps',
  upper,
  'Flexão de cotovelo',
  'Polia',
  ['Polias'],
  'Rosca direta na polia|Rosca martelo na polia|Rosca unilateral na polia|Rosca na polia alta|Rosca com barra W na polia',
);
add(
  'Bíceps',
  upper,
  'Flexão de cotovelo',
  'Máquina',
  ['Máquinas'],
  'Rosca na máquina|Rosca Scott na máquina',
);
add(
  'Bíceps',
  upper,
  'Flexão de cotovelo',
  'Elástico',
  ['Elásticos'],
  'Rosca direta com elástico|Rosca martelo com elástico|Rosca alternada com elástico',
);
add(
  'Tríceps',
  upper,
  'Extensão de cotovelo',
  'Halteres',
  ['Halteres'],
  'Tríceps francês com halter|Tríceps francês unilateral|Tríceps coice com halter|Tríceps testa com halteres|Tríceps extensão bilateral acima da cabeça',
);
add(
  'Tríceps',
  upper,
  'Extensão de cotovelo',
  'Barra',
  ['Barra e anilhas', 'Banco'],
  'Tríceps testa com barra W|Tríceps testa com barra reta|Tríceps francês com barra W|Supino fechado com barra',
);
add(
  'Tríceps',
  upper,
  'Extensão de cotovelo',
  'Polia',
  ['Polias'],
  'Tríceps com corda|Tríceps com barra reta na polia|Tríceps com barra V|Tríceps unilateral na polia|Tríceps com pegada supinada|Tríceps acima da cabeça na polia|Tríceps coice na polia',
);
add(
  'Tríceps',
  upper,
  'Extensão de cotovelo',
  'Elástico',
  ['Elásticos'],
  'Tríceps com elástico|Tríceps acima da cabeça com elástico',
);
add(
  'Antebraços',
  upper,
  'Punho',
  'Halteres',
  ['Halteres'],
  'Flexão de punho com halteres|Extensão de punho com halteres|Pronação com halter|Supinação com halter|Caminhada do fazendeiro com halteres|Sustentação de halteres',
);
add(
  'Quadríceps',
  lower,
  'Agachar',
  'Barra',
  ['Barra e anilhas'],
  'Agachamento frontal|Agachamento sumô com barra|Agachamento com pausa|Agachamento Zercher|Afundo com barra|Passada com barra|Agachamento com barra em caixa',
);
add(
  'Quadríceps',
  lower,
  'Agachar',
  'Halteres',
  ['Halteres'],
  'Agachamento goblet|Agachamento sumô com halter|Agachamento com halteres ao lado|Afundo com halteres|Passada com halteres|Avanço reverso com halteres|Agachamento lateral com halter',
);
add(
  'Quadríceps',
  lower,
  'Agachar',
  'Halteres',
  ['Halteres', 'Banco'],
  'Agachamento búlgaro com halteres|Subida no banco com halteres|Agachamento sentado no banco com halteres',
);
add(
  'Quadríceps',
  lower,
  'Agachar',
  'Máquina',
  ['Máquinas'],
  'Agachamento no Smith|Agachamento hack|Leg press horizontal|Leg press vertical|Leg press unilateral|Cadeira extensora unilateral|Agachamento pêndulo|Agachamento no belt squat',
);
add(
  'Quadríceps',
  lower,
  'Agachar',
  'Peso corporal',
  ['Peso corporal'],
  'Agachamento com pausa no solo|Agachamento sumô com peso corporal|Afundo estático|Avanço alternado|Avanço reverso|Agachamento lateral|Agachamento isométrico na parede|Agachamento unilateral assistido|Agachamento com alcance dos braços',
);
add(
  'Posteriores de coxa',
  lower,
  'Quadril',
  'Barra',
  ['Barra e anilhas'],
  'Levantamento terra convencional|Levantamento terra sumô|Levantamento terra romeno com barra|Stiff com barra|Bom dia com barra|Levantamento terra com pausa',
);
add(
  'Posteriores de coxa',
  lower,
  'Quadril',
  'Halteres',
  ['Halteres'],
  'Levantamento terra com halteres|Levantamento terra romeno com halteres|Stiff com halteres|Stiff unilateral com halter|Levantamento terra romeno em base alternada',
);
add(
  'Posteriores de coxa',
  lower,
  'Flexão de joelho',
  'Máquina',
  ['Máquinas'],
  'Mesa flexora|Cadeira flexora|Flexora em pé|Mesa flexora unilateral|Cadeira flexora unilateral',
);
add(
  'Glúteos',
  lower,
  'Quadril',
  'Barra',
  ['Barra e anilhas', 'Banco'],
  'Elevação pélvica com barra|Elevação pélvica com pausa|Elevação pélvica em base alternada',
);
add(
  'Glúteos',
  lower,
  'Quadril',
  'Halteres',
  ['Halteres'],
  'Ponte de glúteos com halter|Elevação pélvica com halter|Levantamento terra unilateral com halter',
);
add(
  'Glúteos',
  lower,
  'Quadril',
  'Polia',
  ['Polias'],
  'Extensão de quadril na polia|Abdução de quadril na polia|Adução de quadril na polia|Pull through|Extensão de quadril com joelho flexionado na polia',
);
add(
  'Glúteos',
  lower,
  'Quadril',
  'Máquina',
  ['Máquinas'],
  'Cadeira abdutora|Cadeira adutora|Elevação pélvica na máquina|Extensão de quadril na máquina|Abdução de quadril em pé na máquina',
);
add(
  'Glúteos',
  lower,
  'Quadril',
  'Elástico',
  ['Elásticos'],
  'Caminhada lateral com elástico|Abdução de quadril com elástico|Ponte de glúteos com elástico|Extensão de quadril com elástico|Abdução de quadril deitada com elástico',
);
add(
  'Glúteos',
  lower,
  'Quadril',
  'Peso corporal',
  ['Peso corporal'],
  'Ponte de glúteos unilateral|Ponte de glúteos com marcha|Extensão de quadril em quatro apoios|Abdução de quadril deitada|Elevação pélvica unilateral|Clamshell sem elástico',
);
add(
  'Panturrilhas',
  lower,
  'Tornozelo',
  'Máquina',
  ['Máquinas'],
  'Panturrilha no leg press|Panturrilha sentada na máquina|Panturrilha em pé na máquina|Panturrilha unilateral na máquina',
);
add(
  'Panturrilhas',
  lower,
  'Tornozelo',
  'Halteres',
  ['Halteres'],
  'Elevação de panturrilha com halteres|Panturrilha unilateral com halter|Panturrilha sentada com halter',
);
add(
  'Panturrilhas',
  lower,
  'Tornozelo',
  'Peso corporal',
  ['Peso corporal'],
  'Elevação de panturrilha em pé|Elevação de panturrilha unilateral|Elevação de panturrilha com joelhos flexionados|Elevação de ponta dos pés',
);
add(
  'Abdômen',
  'Core',
  'Core',
  'Peso corporal',
  ['Peso corporal'],
  'Prancha frontal|Prancha lateral|Prancha com joelhos apoiados|Prancha com toque nos ombros|Prancha com elevação de perna|Prancha alta|Prancha invertida|Dead bug|Bird dog|Abdominal reverso|Abdominal bicicleta|Abdominal curto|Abdominal com pernas elevadas|Elevação de pernas no solo|Elevação alternada de pernas|Hollow hold|Hollow rock|Abdominal canivete|Abdominal remador|Toque alternado nos calcanhares|Prancha lateral com elevação de quadril|Abdominal cruzado',
);
add(
  'Abdômen',
  'Core',
  'Core',
  'Polia',
  ['Polias'],
  'Abdominal na polia alta|Pallof press|Pallof press ajoelhado|Rotação de tronco na polia|Wood chop na polia|Abdominal oblíquo na polia',
);
add(
  'Abdômen',
  'Core',
  'Core',
  'Máquina',
  ['Máquinas'],
  'Abdominal na máquina|Rotação de tronco na máquina',
);
add(
  'Abdômen',
  'Core',
  'Core',
  'Halteres',
  ['Halteres'],
  'Abdominal com halter|Prancha com arrasto de halter|Caminhada unilateral com halter|Flexão lateral de tronco com halter',
);
add(
  'Mobilidade',
  'Mobilidade',
  'Mobilidade',
  'Peso corporal',
  ['Peso corporal'],
  'Mobilidade de tornozelo na parede|Mobilidade de quadril 90/90|Rotação torácica em quatro apoios|Rotação torácica deitada|Gato e camelo|Círculos de quadril|Mobilidade de punhos|Círculos de ombros|Deslizamento de braços na parede|Alongamento de flexores de quadril|Alongamento de panturrilha na parede|Alongamento de posteriores de coxa|Alongamento de glúteos deitado|Alongamento de peitoral na parede|Alongamento de tríceps|Alongamento de dorsais|Mobilidade de adutores em quatro apoios|Mobilidade de quadril em afundo|Mobilidade de coluna em decúbito|Agachamento profundo com apoio orientado',
);
add(
  'Kettlebell',
  lower,
  'Quadril',
  'Kettlebell',
  ['Kettlebells'],
  'Levantamento terra com kettlebell|Swing com kettlebell|Swing unilateral com kettlebell|Levantamento terra sumô com kettlebell',
);
add(
  'Kettlebell',
  upper,
  'Empurrar',
  'Kettlebell',
  ['Kettlebells'],
  'Desenvolvimento com kettlebell|Desenvolvimento unilateral com kettlebell|Supino no solo com kettlebell',
);
add(
  'Kettlebell',
  lower,
  'Agachar',
  'Kettlebell',
  ['Kettlebells'],
  'Agachamento goblet com kettlebell|Agachamento frontal com kettlebell|Afundo com kettlebell',
);
export const exerciseSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
export const EXPANDED_EXERCISES: CatalogExercise[] = groups.flatMap((g) =>
  g.names.map((name) => ({
    id: `ex-${exerciseSlug(name)}`,
    name,
    group: g.group,
    equipment: g.equipment,
    pattern: g.pattern,
    requires: g.requires,
    secondary: ['Estabilizadores'],
    instructions:
      'Consulte as observações do personal para posicionamento, amplitude, ritmo e execução desta variação.',
    technical:
      'Variação de catálogo para planejamento profissional. A descrição não substitui demonstração ou avaliação individual. Equipamentos e apoios devem ser conferidos pelo personal.',
    alternatives: [],
    tags: [g.muscle, g.pattern, g.group, g.equipment],
    category: g.group === 'Mobilidade' ? 'Mobilidade' : 'Força',
  })),
);
