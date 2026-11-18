import { WEEKDAYS } from './experience';
import type { Workout, WorkoutSession } from './types';
export function trainingWeek(workouts: Workout[], sessions: WorkoutSession[], date: string) {
  const today = new Date(date + 'T12:00:00Z');
  const current = (today.getUTCDay() + 6) % 7;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - current);
  const dates = WEEKDAYS.map((_, index) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + index);
    return d.toISOString().slice(0, 10);
  });
  const versions = new Map<string, string | undefined>();
  const active = workouts.filter((w) => {
    if (!w.programId) return true;
    if (!versions.has(w.programId)) versions.set(w.programId, w.versionId);
    return versions.get(w.programId) === w.versionId;
  });
  const completed = new Set(sessions.filter((s) => dates.includes(s.date)).map((s) => s.workoutId));
  const available = active.filter((w) => w.weekday && !completed.has(w.id));
  const next =
    available.find((w) => w.weekday === WEEKDAYS[current]) ??
    [...available].sort((a, b) => {
      const distance = (w: Workout) =>
        (WEEKDAYS.findIndex((d) => d === w.weekday) - current + 7) % 7;
      return distance(a) - distance(b);
    })[0] ??
    active.find((w) => !w.weekday) ??
    active.find((w) => w.weekday === WEEKDAYS[current]) ??
    active[0];
  return { dates, active, completed, next, weekday: WEEKDAYS[current] };
}
