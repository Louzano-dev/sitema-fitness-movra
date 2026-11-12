import type { Appointment, DemoState } from './types';
export function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join('');
}
export function formatDate(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('pt-BR', options ?? { day: '2-digit', month: 'short' }).format(
    new Date(`${date}T12:00:00`),
  );
}
export function minutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
export function appointmentOverlaps(
  a: Pick<Appointment, 'date' | 'time' | 'duration'>,
  b: Appointment,
) {
  return (
    b.status !== 'Cancelado' &&
    a.date === b.date &&
    minutes(a.time) < minutes(b.time) + b.duration &&
    minutes(b.time) < minutes(a.time) + a.duration
  );
}
export function studentSessions(state: DemoState, id: string) {
  return state.sessions
    .filter((s) => s.studentId === id)
    .sort((a, b) => b.date.localeCompare(a.date));
}
export function studentMeasurements(state: DemoState, id: string) {
  return state.measurements
    .filter((m) => m.studentId === id)
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function sessionVolume(sets: { kg: number; reps: number }[]) {
  return sets.reduce((sum, s) => sum + s.kg * s.reps, 0);
}
