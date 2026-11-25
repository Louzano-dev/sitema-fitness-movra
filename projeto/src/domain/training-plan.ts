import { EXERCISES, type CatalogExercise } from './exercise-catalog';
import { planningById } from './exercise-planning';
import { cardioSeconds, type Cardio } from './cardio';
import type { Prescription, WorkoutSession } from './types';
import { WEEKDAYS, type Questionnaire, type StudioExercise, type TrainingDay } from './experience';
import { muscles, sessionPlan, type SessionPlan, type Slot } from './training-models';

export const movements = EXERCISES.flatMap((exercise) => {
  const meta = planningById.get(exercise.id);
  return meta ? [{...exercise, ...meta}] : [];
});
type Movement = (typeof movements)[number];
const indexById = new Map(movements.map((e) => [e.id, e]));
export const difficulty = (id: string) =>
  ['A classificar', 'Básica', 'Moderada', 'Maior coordenação'][indexById.get(id)?.tier ?? 0];
export const muscleFor = (id: string, catalog: CatalogExercise[] = EXERCISES) => {
  const e = catalog.find((item) => item.id === id.split('--')[0]);
  return e?.primary ?? e?.tags[0] ?? 'Personalizado';
};
export const planning = { setupSeconds: 150, transitionSeconds: 75, secondsPerRep: 3 };
type TimedDay = {
  exercises: Pick<Prescription, 'sets' | 'reps' | 'repsMax' | 'rest'>[];
  cardio?: Cardio[];
};
export function estimateDay(day: TimedDay) {
  const sets = day.exercises.reduce((sum, e) => sum + e.sets, 0);
  const strength = day.exercises.reduce(
    (sum, e) => sum + planning.transitionSeconds +
      e.sets * (e.repsMax ?? e.reps) * planning.secondsPerRep + Math.max(0, e.sets - 1) * e.rest,
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
export interface PlanContext {
  history?: WorkoutSession[];
  favorites?: string[];
  catalog?: CatalogExercise[];
}
function matchesBand(e: Movement, band: Slot[], plan: SessionPlan) {
  if (plan.groups) return band.some((s) => muscles[s] === e.primary);
  if (!band.includes(e.slot)) return false;
  // Isolation can supplement a Full Body session but cannot satisfy its main patterns.
  return !plan.fullBody || e.compound;
}
function missingBands(plan: SessionPlan, exercises: StudioExercise[]) {
  const selected = exercises.map((r) => indexById.get(r.exerciseId));
  return plan.required.filter((band) => !selected.some((e) => e && matchesBand(e,band,plan)));
}
export function compatible(e: CatalogExercise, q: Questionnaire) {
  return !q.excluded.includes(e.id) && !q.avoidPatterns.includes(e.pattern) &&
    !q.avoidPatterns.includes(planningById.get(e.id)?.family ?? '') &&
    e.requires.every((r) => q.equipment.some((v) => v === r));
}
export function selectDay(q: Questionnaire, day: TrainingDay, index: number,
  previous: TrainingDay[], offset: number, context: PlanContext) {
  const weekday = day.weekday as Questionnaire['days'][number];
  const plan = sessionPlan(q,index,weekday);
  const tier = q.level === 'Iniciante' ? 1 : q.level === 'Intermediário' ? 2 : 3;
  const maximumTier = q.experience === 'Sem experiência' ? 1 :
    Math.min(tier + Number(tier === 1), q.experience === 'Mais de um ano' ? 3 : 2);
  const pool = movements.filter((e) => e.tier <= maximumTier && compatible(e,q));
  const start = ((Math.abs(offset) * 7 + index * 11) % (pool.length || 1));
  const rotated = [...pool.slice(start), ...pool.slice(0,start)];
  const used = previous.flatMap((d) => d.exercises.map((r) => r.exerciseId));
  const adjacent = previous.filter((d) => {
    const distance = Math.abs(WEEKDAYS.indexOf(weekday) - WEEKDAYS.indexOf(d.weekday as typeof weekday));
    return distance === 1 || distance === 6;
  });
  const volume = weekVolume(previous);
  const history = new Set((context.history ?? []).filter((s) => s.studentId === q.studentId)
    .slice(0,8).flatMap((s) => s.sets.filter((r) => r.done).map((r) => r.exerciseId.split('--')[0])));
  const strengthMinutes = q.minutes - Math.ceil(estimateDay({exercises:[],cardio:day.cardio}).cardio / 60);
  const selected = [...day.exercises];
  function add(band: Slot[], required: boolean) {
    const candidates = rotated.filter((e) => (required ? matchesBand(e,band,plan) :
      plan.groups ? band.some((s) => muscles[s] === e.primary) : band.includes(e.slot)) &&
      !selected.some((r) => indexById.get(r.exerciseId)?.family === e.family));
    function rank(e: Movement) {
      const previousUses = used.filter((id) => id === e.id).length;
      const weekFamily = used.filter((id) => indexById.get(id)?.family === e.family).length;
      const recovery = adjacent.some((d) => d.exercises.some((r) => indexById.get(r.exerciseId)?.family === e.family));
      const preferred = plan.groups ? 0 : Math.max(0,band.indexOf(e.slot)) * 35;
      return preferred + (required && !e.compound ? 25 : 0) + previousUses * 12 + weekFamily * 3 +
        Number(recovery) * 5 + Math.abs(e.tier - tier) - Number(context.favorites?.includes(e.id)) * 2 -
        Number(history.has(e.id));
    }
    const e = candidates.sort((x,y) => rank(x)-rank(y))[0];
    if (!e) return;
    const heavy = e.compound && q.goal === 'Força';
    const mobility = e.slot === 'mobilidade';
    const reps = heavy ? 6 : q.goal === 'Resistência muscular' ? 12 : mobility || q.goal === 'Hipertrofia' ? 8 : 10;
    let sets = tier === 1 || !e.compound || strengthMinutes < 35 ? 2 : 3;
    if (adjacent.length && (volume[e.primary] ?? 0) >= 6) sets = Math.max(2, sets-1);
    if (tier > 1 && strengthMinutes >= 45 && !adjacent.length && q.priority === e.primary) sets += 1;
    const row: StudioExercise = {id:`row-${index}-${e.id}`,exerciseId:e.id,sets,reps,repsMax:reps+2,
      rest:heavy ? 120 : mobility ? 30 : e.compound && tier > 1 ? 75 : 45,notes:'',locked:false};
    while (selected.some((item) => item.id === row.id)) row.id += '-new';
    if (estimateDay({exercises:[...selected,row],cardio:day.cardio}).minutes <= q.minutes) selected.push(row);
  }
  for (const band of plan.required) {
    if (missingBands(plan,selected).includes(band)) add(band,true);
  }
  for (const slot of plan.slots) add([slot],false);
  const missing = missingBands(plan,selected);
  return {selected, covered:!missing.length, missing, minimum:strengthMinutes >= 25 ? 2 : 1};
}

export function assessProgram(days: TrainingDay[], q?: Questionnaire, catalog: CatalogExercise[] = EXERCISES) {
  const errors: string[] = [], warnings: string[] = [];
  const volume = weekVolume(days,catalog);
  const frequencies = new Map<string,number>();
  const usage = new Map<string,number>();
  const planDays = WEEKDAYS.filter((weekday) => q?.days.includes(weekday));
  const fullBodyWeek = !!q && planDays.every((d,i) => sessionPlan(q,i,d).fullBody);
  const actualSlots = new Set<Slot>();
  for (const day of days) {
    const groups = new Set<string>();
    const direct = new Set<string>();
    const ids = new Set<string>();
    const families = new Set<string>();
    const index = planDays.indexOf(day.weekday as typeof WEEKDAYS[number]);
    for (const row of day.exercises) {
      const e = catalog.find((item) => item.id === row.exerciseId);
      if (!e) { errors.push(`${day.weekday} · exercício ausente na biblioteca.`); continue; }
      const meta = planningById.get(e.id);
      if (meta) actualSlots.add(meta.slot);
      const primary = muscleFor(e.id,catalog);
      direct.add(primary); groups.add(primary);
      for (const group of e.secondary) groups.add(group);
      if (ids.has(e.id) || (meta && families.has(meta.family)))
        warnings.push(`${day.weekday} · repetição de ${e.name} ou de uma variação equivalente.`);
      ids.add(e.id);
      if (meta) families.add(meta.family);
      if (q && !compatible(e,q)) errors.push(`${day.weekday} · ${e.name} conflita com as exclusões ou os equipamentos.`);
    }
    for (const id of ids) usage.set(id,(usage.get(id) ?? 0)+1);
    for (const group of groups) frequencies.set(group,(frequencies.get(group) ?? 0)+1);
    if (!day.exercises.length && !day.cardio?.length) errors.push(`${day.weekday} · dia vazio.`);
    if (day.exercises.length === 1 && (!q || q.minutes - estimateDay(day).cardio/60 >= 45))
      warnings.push(`${day.weekday} · sessão com um único exercício. Confira se está completa.`);
    if (q && estimateDay(day).minutes > q.minutes) errors.push(`${day.weekday} · duração estimada acima dos ${q.minutes} min disponíveis.`);
    if (q && index >= 0) {
      const missing = missingBands(sessionPlan(q,index,planDays[index]),day.exercises);
      if (missing.length) warnings.push(`${day.weekday} · cobertura incompleta do foco: ${missing.map((b) => b.map((s) => muscles[s]).join(' ou ')).join(', ')}.`);
    }
    const missingGroups = day.groups?.filter((g) => !direct.has(g));
    if (missingGroups?.length) warnings.push(`${day.weekday} · grupos planejados sem séries diretas: ${missingGroups.join(', ')}.`);
  }
  if (fullBodyWeek && (!actualSlots.has('joelho') || !actualSlots.has('quadril')))
    warnings.push('Corpo inteiro · confira a distribuição semanal entre joelho e quadril.');
  if (days.some((d) => d.exercises.some((r) => muscleFor(r.exerciseId,catalog) !== 'Mobilidade'))) {
    const low = ['Peitoral','Dorsais','Quadríceps','Glúteos','Posteriores de coxa','Ombros','Bíceps','Tríceps','Core','Panturrilhas']
      .filter((m) => (frequencies.get(m) ?? 0) < 2);
    if (low.length) warnings.push('Estímulo identificado em menos de dois dias da semana: ' + low.join(', ') + '. Considere os objetivos individuais.');
  }
  const repeated = [...usage].filter(([,n]) => n>1).map(([id]) => catalog.find((e) => e.id === id)?.name).filter(Boolean);
  if (repeated.length) warnings.push('Exercícios presentes em mais de um dia: ' + repeated.join(', ') + '.');
  for (const [i,day] of days.entries()) {
    const next = days.find((other,j) => i !== j && (WEEKDAYS.indexOf(other.weekday as typeof WEEKDAYS[number]) -
      WEEKDAYS.indexOf(day.weekday as typeof WEEKDAYS[number])+7)%7 === 1);
    if (!next) continue;
    const current = Object.keys(weekVolume([day],catalog)).filter((m) => m !== 'Mobilidade');
    const overlap = Object.keys(weekVolume([next],catalog)).filter((m) => current.includes(m));
    if (overlap.length) warnings.push(`${day.weekday} e ${next.weekday} · revise a recuperação de ${overlap.join(', ')}.`);
  }
  return {warnings:[...new Set(warnings)],errors:[...new Set(errors)],volume};
}
