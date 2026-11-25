import { z } from 'zod';
import type { DemoState } from './types';

export const habitSchema = z.object({
  zone: z.string(),
  visible: z.boolean(),
  seenStage: z.number().int().min(0).max(4).optional(),
  plans: z.array(
    z.object({ from: z.iso.date(), weekdays: z.array(z.number().int().min(0).max(6)) }),
  ),
  pauses: z.array(z.object({ from: z.iso.date(), through: z.iso.date() })),
  moves: z.array(z.object({ from: z.iso.date(), to: z.iso.date() })),
});
export type Routine = z.infer<typeof habitSchema>;
export type Activity = { date: string; extra?: boolean; completedAt?: string };

export function newRoutine(zone = Intl.DateTimeFormat().resolvedOptions().timeZone): Routine {
  return { zone, visible: true, plans: [], pauses: [], moves: [] };
}

export function civilDate(instant = new Date(), zone?: string) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const field = (key: string) => parts.find((p) => p.type === key)?.value;
  return `${field('year')}-${field('month')}-${field('day')}`;
}

// Calendar arithmetic uses UTC only as a representation of a civil date, never as its time zone.
export function addDays(date: string, days: number) {
  const value = new Date(date + 'T12:00:00Z');
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
const weekday = (date: string) => (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7;
export const weekdaysAt = (routine: Routine, date: string) =>
  routine.plans.filter((p) => p.from <= date).at(-1)?.weekdays ?? [];
export const pausedOn = (routine: Routine, date: string) =>
  routine.pauses.some((pause) => pause.from <= date && date <= pause.through);
export function plannedOn(routine: Routine, date: string) {
  if (pausedOn(routine, date)) return false;
  if (routine.moves.some((move) => move.to === date)) return true;
  return (
    !routine.moves.some((move) => move.from === date) &&
    weekdaysAt(routine, date).includes(weekday(date))
  );
}

export function setWeekdays(routine: Routine, weekdays: number[], today: string): Routine {
  const unique = [...new Set(weekdays)].sort((a, b) => a - b);
  if (unique.some((day) => !Number.isInteger(day) || day < 0 || day > 6))
    throw Error('Dia da semana inválido.');
  const from = routine.plans.length ? addDays(today, 1) : today;
  return {
    ...routine,
    plans: [...routine.plans.filter((p) => p.from < from), { from, weekdays: unique }],
  };
}

export function pauseRoutine(
  routine: Routine,
  from: string,
  through: string,
  today: string,
  activities: Activity[],
): Routine {
  if (
    ![from, through].every((d) => z.iso.date().safeParse(d).success) ||
    from < today ||
    through < from
  )
    throw Error('Escolha um período a partir de hoje, com o fim após o início.');
  if (from === today && activities.some((a) => a.date === today && a.completedAt && !a.extra))
    throw Error('A atividade de hoje já foi registrada. Comece a pausa amanhã.');
  return { ...routine, pauses: [...routine.pauses, { from, through }] };
}

export function moveSession(
  routine: Routine,
  from: string,
  to: string,
  today: string,
  activities: Activity[],
): Routine {
  if (
    ![from, to].every((d) => z.iso.date().safeParse(d).success) ||
    from < today ||
    to < today ||
    from === to ||
    !plannedOn(routine, from) ||
    plannedOn(routine, to) ||
    pausedOn(routine, to)
  )
    throw Error('Escolha uma sessão planejada e um dia livre a partir de hoje.');
  if (activities.some((a) => a.completedAt && !a.extra && (a.date === from || a.date === to)))
    throw Error('Uma dessas datas já tem atividade registrada.');
  const previous = routine.moves.find((m) => m.to === from);
  const origin = previous?.from ?? from;
  const moves = routine.moves.filter((m) => m !== previous);
  if (origin !== to) moves.push({ from: origin, to });
  return { ...routine, moves };
}

export const stages = [
  { name: 'Início', weeks: 0 },
  { name: 'Ritmo', weeks: 1 },
  { name: 'Firme', weeks: 3 },
  { name: 'Força', weeks: 6 },
  { name: 'Elite', weeks: 12 },
] as const;

export function activitiesFor(data: DemoState, studentId: string) {
  return [
    ...data.sessions.filter((s) => s.studentId === studentId),
    ...(data.experience.cardioRecords ?? []).filter(
      (r) => r.studentId === studentId && r.independent,
    ),
  ];
}

export function consistency(routine: Routine, activities: Activity[], today: string) {
  const completed = new Set(activities.filter((a) => a.completedAt && !a.extra).map((a) => a.date));
  const recorded = new Set(
    activities.filter((a) => a.completedAt && a.date <= today).map((a) => a.date),
  );
  const achievements: { id: string; title: string; date: string }[] = [];
  const firstWorkout = [...recorded].sort()[0];
  if (firstWorkout)
    achievements.push({ id: 'first-workout', title: 'Primeiro treino', date: firstWorkout });
  const monday = addDays(today, -weekday(today));
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    return {
      date,
      planned: plannedOn(routine, date),
      done: date <= today && completed.has(date),
      activity: date <= today && recorded.has(date),
    };
  });
  const first = routine.plans[0]?.from;
  let streak = 0,
    bestStreak = 0,
    goalWeeks = 0,
    weekStreak = 0,
    planned = 0,
    met = 0;
  // Only closed weeks award a milestone. A week entirely off preserves the weekly streak.
  if (first)
    for (let day = first; day <= today; day = addDays(day, 1)) {
      if (plannedOn(routine, day)) {
        planned++;
        if (completed.has(day)) {
          streak++;
          bestStreak = Math.max(bestStreak, streak);
          met++;
        } else if (day < today) streak = 0;
      }
      if (weekday(day) === 6 && day < today) {
        if (planned && met === planned) {
          goalWeeks++;
          weekStreak++;
          const milestone = stages.find((s) => s.weeks === goalWeeks);
          if (milestone)
            achievements.push({
              id: 'weeks-' + milestone.weeks,
              title:
                goalWeeks === 1
                  ? 'Primeira semana com meta alcançada'
                  : `${goalWeeks} semanas com meta alcançada`,
              date: addDays(day, 1),
            });
        } else if (planned) weekStreak = 0;
        planned = 0;
        met = 0;
      }
    }
  const starts = [
    today,
    ...routine.plans.map((p) => p.from),
    ...routine.pauses.map((p) => addDays(p.through, 1)),
    ...routine.moves.map((m) => addDays(m.from, 1)),
  ];
  const candidates = new Set(routine.moves.map((m) => m.to));
  for (const start of starts.filter((s) => s >= today)) {
    for (let n = 0; n <= 7; n++) candidates.add(addDays(start, n));
  }
  const next = [...candidates]
    .sort()
    .find((day) => day >= today && plannedOn(routine, day) && !completed.has(day));
  return {
    days,
    streak,
    bestStreak,
    weekStreak,
    goalWeeks,
    next,
    target: days.filter((d) => d.planned).length,
    weekly: days.filter((d) => d.planned && d.done).length,
    stage: stages.filter((s) => goalWeeks >= s.weeks).length - 1,
    achievements,
  };
}

export function completionReward(
  before: DemoState,
  after: DemoState,
  studentId: string,
  id: string,
) {
  const routine = after.experience.habits?.[studentId] ?? newRoutine();
  const previousActivities = activitiesFor(before, studentId);
  if (!routine.visible || previousActivities.some((a) => a.id === id && a.completedAt)) return null;
  const activities = activitiesFor(after, studentId);
  const saved = activities.find((a) => a.id === id && a.completedAt);
  if (!saved) return null;
  const previous = consistency(routine, previousActivities, saved.date);
  const current = consistency(routine, activities, saved.date);
  return {
    id,
    stage: current.stage,
    streak: current.streak,
    weekly: current.weekly,
    target: current.target,
    advanced: current.weekly > previous.weekly,
    unlocked: current.achievements.filter((a) => !previous.achievements.some((p) => p.id === a.id)),
  };
}
export type CompletionReward = NonNullable<ReturnType<typeof completionReward>>;
