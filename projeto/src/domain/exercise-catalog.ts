import type { Exercise } from './types';
import { EXPANDED_EXERCISES, exerciseSlug } from './exercise-expansion';
import { planningById } from './exercise-planning';
export interface CatalogExercise extends Exercise {
  secondary: string[];
  pattern: string;
  requires: string[];
  technical: string;
  alternatives: string[];
  tags: string[];
  category: string;
  primary?: string;
  synonyms?: string[];
  reviewStatus?: string;
}
const entries: [string, string, string, string, string, string[]][] = [
  [
    'agachamento',
    'Agachamento livre',
    'Membros inferiores',
    'Barra',
    'Agachar',
    ['Barra e anilhas'],
  ],
  ['legpress', 'Leg press 45°', 'Membros inferiores', 'Máquina', 'Agachar', ['Máquinas']],
  [
    'extensora',
    'Cadeira extensora',
    'Membros inferiores',
    'Máquina',
    'Extensão de joelho',
    ['Máquinas'],
  ],
  ['remada', 'Remada baixa', 'Membros superiores', 'Polia', 'Puxar', ['Polias']],
  [
    'supino',
    'Supino com halteres',
    'Membros superiores',
    'Halteres',
    'Empurrar',
    ['Halteres', 'Banco'],
  ],
  ['elevacao', 'Elevação lateral', 'Membros superiores', 'Halteres', 'Elevar', ['Halteres']],
  ['abdominal', 'Abdominal no solo', 'Core', 'Colchonete', 'Core', ['Peso corporal']],
  ['ponte', 'Ponte de glúteos', 'Membros inferiores', 'Colchonete', 'Quadril', ['Peso corporal']],
  [
    'agachamento-corporal',
    'Agachamento com peso corporal',
    'Membros inferiores',
    'Peso corporal',
    'Agachar',
    ['Peso corporal'],
  ],
  [
    'flexao',
    'Flexão de braços',
    'Membros superiores',
    'Peso corporal',
    'Empurrar',
    ['Peso corporal'],
  ],
  [
    'remada-elastico',
    'Remada com elástico',
    'Membros superiores',
    'Elástico',
    'Puxar',
    ['Elásticos'],
  ],
  ['remada-halter', 'Remada com halter', 'Membros superiores', 'Halteres', 'Puxar', ['Halteres']],
  [
    'desenvolvimento',
    'Desenvolvimento com halteres',
    'Membros superiores',
    'Halteres',
    'Empurrar',
    ['Halteres'],
  ],
  [
    'rosca',
    'Rosca com halteres',
    'Membros superiores',
    'Halteres',
    'Flexão de cotovelo',
    ['Halteres'],
  ],
  [
    'triceps',
    'Tríceps na polia',
    'Membros superiores',
    'Polia',
    'Extensão de cotovelo',
    ['Polias'],
  ],
  [
    'terra-kettlebell',
    'Levantamento com kettlebell',
    'Membros inferiores',
    'Kettlebell',
    'Quadril',
    ['Kettlebells'],
  ],
  [
    'panturrilha',
    'Elevação de panturrilha',
    'Membros inferiores',
    'Peso corporal',
    'Tornozelo',
    ['Peso corporal'],
  ],
  [
    'mobilidade-quadril',
    'Mobilidade de quadril',
    'Mobilidade',
    'Peso corporal',
    'Mobilidade',
    ['Peso corporal'],
  ],
  [
    'mobilidade-ombro',
    'Mobilidade de ombros',
    'Mobilidade',
    'Peso corporal',
    'Mobilidade',
    ['Peso corporal'],
  ],
  ['caminhada', 'Caminhada na esteira', 'Condicionamento', 'Esteira', 'Locomoção', ['Esteira']],
  [
    'bicicleta',
    'Bicicleta ergométrica',
    'Condicionamento',
    'Bicicleta',
    'Locomoção',
    ['Bicicleta ergométrica'],
  ],
  [
    'afundo',
    'Afundo com apoio orientado',
    'Membros inferiores',
    'Peso corporal',
    'Agachar',
    ['Peso corporal'],
  ],
];
export const EXERCISES: CatalogExercise[] = entries.map(
  ([id, name, group, equipment, pattern, requires]) => ({
    id,
    name,
    group,
    equipment,
    pattern,
    requires,
    secondary: group === 'Membros inferiores' ? ['Core'] : ['Estabilizadores'],
    instructions:
      'Execute de forma controlada, conforme a amplitude e a técnica orientadas pelo profissional.',
    technical:
      'Ajuste apoios, amplitude e execução na revisão presencial ou online. A descrição não substitui avaliação individual.',
    alternatives: entries.filter((e) => e[4] === pattern && e[0] !== id).map((e) => e[0]),
    tags: [pattern, group, equipment],
    category:
      group === 'Mobilidade'
        ? 'Mobilidade'
        : group === 'Condicionamento'
          ? 'Condicionamento'
          : 'Força',
  }),
);
export const ORIGINAL_EXERCISES = EXERCISES.slice();
const knownNames = new Set(EXERCISES.map((e) => exerciseSlug(e.name)));
for (const exercise of EXPANDED_EXERCISES) {
  if (knownNames.has(exerciseSlug(exercise.name))) continue;
  knownNames.add(exerciseSlug(exercise.name));
  EXERCISES.push({
    ...exercise,
    alternatives: EXERCISES.filter(
      (e) => e.pattern === exercise.pattern && e.group === exercise.group,
    )
      .slice(0, 4)
      .map((e) => e.id),
  });
}

for (const exercise of EXERCISES) {
  const metadata = planningById.get(exercise.id);
  if (!metadata) continue;
  exercise.primary = metadata.primary;
  exercise.secondary = metadata.secondary;
  exercise.synonyms = metadata.synonyms;
  exercise.reviewStatus = metadata.reviewStatus;
  exercise.tags = [...new Set([metadata.primary, metadata.family, ...exercise.tags, ...metadata.synonyms])];
  exercise.alternatives = EXERCISES.filter((other) =>
    other.id !== exercise.id && planningById.get(other.id)?.slot === metadata.slot
  ).sort((a,b) => Number(planningById.get(b.id)?.family === metadata.family)
    - Number(planningById.get(a.id)?.family === metadata.family)).slice(0,4).map((e) => e.id);
}

export function studioCatalog(exercises: Exercise[]): CatalogExercise[] {
  const custom = exercises
    .filter((e) => e.id.startsWith('own-') && !e.id.includes('--'))
    .map((e) => ({
      ...e,
      pattern: e.pattern ?? 'Personalizado',
      category: 'Personalizado',
      requires: [e.equipment],
      tags: [e.group, e.equipment, e.pattern ?? 'Personalizado'],
      secondary: [],
      alternatives: [],
      technical: 'Orientação cadastrada pelo personal.',
    }));
  return [...EXERCISES, ...custom];
}
