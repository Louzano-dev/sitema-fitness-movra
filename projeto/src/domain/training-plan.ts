import { EXERCISES, type CatalogExercise } from './exercise-catalog';
import { cardioSeconds, type Cardio } from './cardio';
import type { Prescription, WorkoutSession } from './types';
import type { DAY_FOCUS, Questionnaire, StudioExercise, TrainingDay } from './experience';
import { WEEKDAYS } from './experience';

type Slot =
  | 'joelho'
  | 'quadril'
  | 'peito'
  | 'costas'
  | 'ombros'
  | 'bíceps'
  | 'tríceps'
  | 'posterior'
  | 'panturrilha'
  | 'core'
  | 'mobilidade';
type Focus = (typeof DAY_FOCUS)[number];
// Only movements with an explicit planning role enter automatic proposals.
const families: [Slot, number, string[]][] = [
  ['joelho', 1, ['agachamento-corporal', 'legpress', 'ex-agachamento-goblet', 'extensora']],
  ['joelho', 2, ['afundo', 'ex-afundo-com-halteres', 'ex-leg-press-horizontal']],
  ['joelho', 3, ['agachamento', 'ex-agachamento-frontal']],
  ['quadril', 1, ['ponte', 'terra-kettlebell']],
  [
    'quadril',
    2,
    ['ex-levantamento-terra-romeno-com-halteres', 'ex-levantamento-terra-com-halteres'],
  ],
  ['quadril', 3, ['ex-levantamento-terra-romeno-com-barra', 'ex-levantamento-terra-convencional']],
  ['quadril', 1, ['ex-cadeira-abdutora', 'ex-abducao-de-quadril-deitada']],
  ['peito', 1, ['ex-peck-deck']],
  ['costas', 2, ['ex-pulldown-com-bracos-estendidos']],
  ['posterior', 1, ['ex-mesa-flexora', 'ex-cadeira-flexora']],
  ['peito', 1, ['ex-supino-na-maquina', 'supino', 'ex-supino-convergente']],
  ['peito', 2, ['flexao', 'ex-supino-inclinado-com-halteres', 'ex-supino-reto-com-barra']],
  ['peito', 1, ['ex-flexao-de-bracos-com-joelhos-apoiados']],
  ['costas', 1, ['remada', 'remada-elastico', 'ex-puxada-frontal-neutra', 'ex-remada-articulada']],
  ['costas', 2, ['remada-halter', 'ex-puxada-frontal-aberta', 'ex-remada-com-peito-apoiado']],
  ['costas', 3, ['ex-remada-curvada-com-barra']],
  ['ombros', 1, ['elevacao', 'ex-elevacao-lateral-na-maquina', 'ex-desenvolvimento-na-maquina']],
  [
    'ombros',
    2,
    ['desenvolvimento', 'ex-desenvolvimento-com-elastico', 'ex-elevacao-lateral-na-polia'],
  ],
  [
    'bíceps',
    1,
    ['rosca', 'ex-rosca-direta-na-polia', 'ex-rosca-martelo', 'ex-rosca-direta-com-elastico'],
  ],
  ['tríceps', 1, ['triceps', 'ex-triceps-unilateral-na-polia']],
  ['tríceps', 2, ['ex-triceps-frances-com-halter', 'ex-triceps-coice-com-halter']],
  ['panturrilha', 1, ['panturrilha']],
  ['core', 1, ['ex-dead-bug', 'abdominal', 'ex-bird-dog']],
  ['core', 2, ['ex-pallof-press', 'ex-abdominal-reverso']],
  [
    'mobilidade',
    1,
    [
      'mobilidade-quadril',
      'mobilidade-ombro',
      'ex-mobilidade-de-tornozelo-na-parede',
      'ex-rotacao-toracica-deitada',
      'ex-circulos-de-ombros',
      'ex-gato-e-camelo',
    ],
  ],
];
export const movements = families.flatMap(([slot, tier, ids]) =>
  ids.flatMap((id) => {
    const exercise = EXERCISES.find((item) => item.id === id);
    return exercise ? [{ ...exercise, slot, tier }] : [];
  }),
);
// Distinguish complementary variations within the same muscle group and movement pattern.
function variation(id: string) {
  if (/terra/.test(id)) return 'dobradiça';
  if (/agachamento/.test(id)) return 'agachamento';
  if (/afundo/.test(id)) return 'afundo';
  if (/leg-?press/.test(id)) return 'leg press';
  if (/remada/.test(id)) return 'remada';
  if (/puxada/.test(id)) return 'puxada';
  if (/desenvolvimento/.test(id)) return 'desenvolvimento';
  if (/elevacao-lateral|^elevacao$/.test(id)) return 'elevação lateral';
  if (/supino/.test(id) && !id.includes('inclinado')) return 'supino horizontal';
  if (/rosca/.test(id) && !id.includes('martelo')) return 'rosca supinada';
  return id;
}
const isolation = new Set([
  'extensora',
  'ex-peck-deck',
  'ex-cadeira-abdutora',
  'ex-abducao-de-quadril-deitada',
  'ex-pulldown-com-bracos-estendidos',
]);
const indexById = new Map(movements.map((e) => [e.id, e]));
export const difficulty = (id: string) =>
  ['A classificar', 'Básica', 'Moderada', 'Maior coordenação'][indexById.get(id)?.tier ?? 0];
const muscles: Record<Slot, string> = {
  joelho: 'Quadríceps',
  quadril: 'Glúteos',
  peito: 'Peitoral',
  costas: 'Dorsais',
  ombros: 'Ombros',
  bíceps: 'Bíceps',
  tríceps: 'Tríceps',
  posterior: 'Posteriores de coxa',
  panturrilha: 'Panturrilhas',
  core: 'Core',
  mobilidade: 'Mobilidade',
};
export const muscleFor = (id: string, catalog: CatalogExercise[] = EXERCISES) => {
  const base = id.split('--')[0];
  const item = indexById.get(base);
  return item
    ? muscles[item.slot]
    : (catalog.find((e) => e.id === base)?.tags[0] ?? 'Personalizado');
};
export const planning = {
  setupSeconds: 150,
  transitionSeconds: 75,
  secondsPerRep: 3,
  targets: [
    { minutes: 20, count: 2 },
    { minutes: 35, count: 4 },
    { minutes: 50, count: 6 },
    { minutes: 120, count: 8 },
  ],
};
type TimedDay = {
  exercises: Pick<Prescription, 'sets' | 'reps' | 'repsMax' | 'rest'>[];
  cardio?: Cardio[];
};
export function estimateDay(day: TimedDay) {
  const sets = day.exercises.reduce((sum, e) => sum + e.sets, 0);
  const strength = day.exercises.reduce(
    (sum, e) =>
      sum +
      planning.transitionSeconds +
      e.sets * (e.repsMax ?? e.reps) * planning.secondsPerRep +
      Math.max(0, e.sets - 1) * e.rest,
    sets ? planning.setupSeconds : 0,
  );
  const cardio = (day.cardio ?? []).reduce((sum, c) => sum + cardioSeconds(c), 0);
  return { sets, strength, cardio, minutes: Math.ceil((strength + cardio) / 60) };
}
export function weekVolume(days: TrainingDay[], catalog: CatalogExercise[] = EXERCISES) {
  const volume: Record<string, number> = {};
  for (const day of days)
    for (const row of day.exercises) {
      const key = muscleFor(row.exerciseId, catalog);
      volume[key] = (volume[key] ?? 0) + row.sets;
    }
  return volume;
}
const slots: Record<Focus, Slot[]> = {
  'Corpo inteiro': [
    'joelho',
    'peito',
    'costas',
    'quadril',
    'core',
    'ombros',
    'panturrilha',
    'posterior',
  ],
  Superior: ['peito', 'costas', 'ombros', 'costas', 'peito', 'tríceps', 'bíceps', 'core'],
  Inferior: ['joelho', 'quadril', 'posterior', 'joelho', 'panturrilha', 'core', 'quadril', 'core'],
  Empurrar: ['peito', 'ombros', 'peito', 'tríceps', 'ombros', 'core', 'tríceps', 'core'],
  Puxar: ['costas', 'costas', 'bíceps', 'costas', 'core', 'bíceps', 'core', 'bíceps'],
  Mobilidade: Array<Slot>(8).fill('mobilidade'),
};
export function dayFocus(
  q: Questionnaire,
  index: number,
  weekday: Questionnaire['days'][number],
): Focus {
  if (q.goal === 'Mobilidade') return 'Mobilidade';
  if (q.split === 'Personalizada') return q.dayFocus?.[weekday] ?? 'Corpo inteiro';
  if (q.split === 'A/B/C' || q.split === 'Push/Pull/Legs')
    return (['Empurrar', 'Puxar', 'Inferior'] as const)[index % 3];
  if (
    ['A/B', 'Upper/Lower', 'Superior/inferior'].includes(q.split) &&
    !(q.split === 'A/B' && q.level === 'Iniciante')
  )
    return index % 2 ? 'Inferior' : 'Superior';
  if (q.split === 'Padrões de movimento')
    return (['Superior', 'Inferior', 'Corpo inteiro'] as const)[index % 3];
  return 'Corpo inteiro';
}
export interface PlanContext {
  history?: WorkoutSession[];
  favorites?: string[];
}
export function selectDay(
  q: Questionnaire,
  day: TrainingDay,
  index: number,
  previous: TrainingDay[],
  offset: number,
  context: PlanContext,
) {
  const weekday = day.weekday as Questionnaire['days'][number];
  const focus = dayFocus(q, index, weekday);
  const tier = q.level === 'Iniciante' ? 1 : q.level === 'Intermediário' ? 2 : 3;
  const order = [...slots[focus]];
  if (focus === 'Corpo inteiro' && index % 2)
    order.splice(0, 4, 'quadril', 'costas', 'peito', 'joelho');
  const maximumTier =
    q.experience === 'Sem experiência'
      ? 1
      : Math.min(tier + Number(tier === 1), q.experience === 'Mais de um ano' ? 3 : 2);
  const available = movements.filter(
    (e) =>
      order.includes(e.slot) &&
      e.tier <= maximumTier &&
      e.requires.every((r) => q.equipment.some((v) => v === r)) &&
      !q.excluded.includes(e.id) &&
      !q.avoidPatterns.includes(e.pattern),
  );
  const volume = weekVolume(previous);
  const last = previous
    .filter((d) => WEEKDAYS.indexOf(d.weekday as typeof weekday) < WEEKDAYS.indexOf(weekday))
    .at(-1);
  const adjacent =
    last && WEEKDAYS.indexOf(weekday) - WEEKDAYS.indexOf(last.weekday as typeof weekday) === 1;
  const usedIds = previous.flatMap((d) => d.exercises.map((e) => e.exerciseId));
  const history = new Set(
    (context.history ?? [])
      .filter((s) => s.studentId === q.studentId)
      .slice(0, 8)
      .flatMap((s) => s.sets.filter((r) => r.done).map((r) => r.exerciseId.split('--')[0])),
  );
  const coreTime =
    q.minutes - Math.ceil(estimateDay({ exercises: [], cardio: day.cardio }).cardio / 60);
  const target = Math.min(
    planning.targets.find((t) => coreTime <= t.minutes)?.count ?? 8,
    tier === 1 ? 6 : tier === 2 ? 7 : 8,
  );
  const selected = [...day.exercises];
  const rotated = [
    ...available.slice(offset % Math.max(1, available.length)),
    ...available.slice(0, offset % Math.max(1, available.length)),
  ];
  for (const slot of [...order, ...order]) {
    if (selected.length >= target) break;
    const pool = rotated.filter(
      (e) => e.slot === slot && !selected.some((r) => variation(r.exerciseId) === variation(e.id)),
    );
    const firstOfGroup = !selected.some((r) => indexById.get(r.exerciseId)?.slot === slot);
    const rank = (e: (typeof movements)[number]) =>
      (isolation.has(e.id) ? (firstOfGroup ? 80 : 18) : 0) +
      usedIds.filter((id) => id === e.id).length * 15 +
      (adjacent && last?.exercises.some((r) => r.exerciseId === e.id) ? 8 : 0) +
      Math.abs(e.tier - tier) * 1.25 -
      (context.favorites?.includes(e.id) ? 2 : 0) -
      (history.has(e.id) ? 1 : 0);
    const e = pool.sort((a, b) => rank(a) - rank(b))[0];
    if (!e) continue;
    const first = selected.length < 2,
      compound = ['joelho', 'quadril', 'peito', 'costas'].includes(slot) && !isolation.has(e.id);
    const heavy = compound && first && (q.goal === 'Força' || tier === 3);
    let sets = tier === 1 || !compound || q.goal === 'Mobilidade' ? 2 : 3;
    if (tier === 3 && heavy && coreTime >= 45 && q.experience === 'Mais de um ano') sets = 4;
    if (adjacent && (volume[muscles[slot]] ?? 0) >= 6) sets = Math.max(2, sets - 1);
    if (q.priority === muscles[slot] && tier > 1 && coreTime >= 45 && !adjacent)
      sets = Math.min(4, sets + 1);
    const reps = heavy
      ? 6
      : q.goal === 'Resistência muscular'
        ? 12
        : q.goal === 'Hipertrofia' && compound
          ? 8
          : 10;
    const row: StudioExercise = {
      id: `row-${index}-${e.id}`,
      exerciseId: e.id,
      sets,
      reps,
      repsMax: reps + 2,
      rest: heavy ? 120 : compound && tier > 1 ? 75 : 45,
      notes: '',
      locked: false,
    };
    while (selected.some((item) => item.id === row.id)) row.id += '-new';
    if (estimateDay({ exercises: [...selected, row], cardio: day.cardio }).minutes <= q.minutes)
      selected.push(row);
  }
  const selectedSlots = selected.map((r) => indexById.get(r.exerciseId)?.slot);
  const primary: Record<Focus, Slot[]> = {
    'Corpo inteiro': ['joelho', 'peito', 'costas', 'quadril'],
    Superior: ['peito', 'costas', 'ombros'],
    Inferior: ['joelho', 'quadril'],
    Empurrar: ['peito', 'ombros'],
    Puxar: ['costas'],
    Mobilidade: ['mobilidade'],
  };
  const covered = selectedSlots.some((slot) => slot && primary[focus].includes(slot));
  return {
    covered,
    focus,
    target,
    selected,
    minimum: q.minutes >= 45 ? Math.max(2, Math.min(4, target - 1)) : Math.min(2, target),
  };
}
