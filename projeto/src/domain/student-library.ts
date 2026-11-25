import { z } from 'zod';
import type { Workout } from './types';

export const deliverySchema = z.object({
  trainerId: z.string(),
  trainerName: z.string(),
  linkId: z.string(),
  issuedAt: z.number(),
  title: z.string(),
  goal: z.string(),
  policy: z.literal('retained-personal-use'),
});
export const librarySchema = z.object({
  main: z.string().optional(),
  entries: z.record(z.string(), z.enum(['active', 'saved', 'archived', 'removed'])),
});
export type Library = z.infer<typeof librarySchema>;
export const emptyLibrary: Library = { entries: {} };
export const libraryKey = (w: Workout) =>
  JSON.stringify([w.delivery?.trainerId ?? '', w.programId ?? w.id, w.versionId ?? '']);
export function libraryGroups(workouts: Workout[], studentId: string, library: Library) {
  const groups = new Map<string, Workout[]>();
  const latest = new Set<string>();
  for (const workout of workouts) {
    if (workout.studentId !== studentId) continue;
    const key = libraryKey(workout);
    const group = groups.get(key);
    if (group) group.push(workout);
    else groups.set(key, [workout]);
  }
  return Array.from(groups, ([key, days]) => {
    const first = days[0];
    const program = JSON.stringify([first.delivery?.trainerId, first.programId ?? first.id]);
    const previous = latest.has(program);
    latest.add(program);
    const status = library.entries[key] ?? (previous ? 'archived' : 'active');
    return {
      key,
      days,
      status,
      previous,
      main: library.main === key,
      title: first.delivery?.title ?? first.title,
      trainer: first.delivery?.trainerName ?? 'Origem não registrada',
      goal: first.delivery?.goal ?? '',
    };
  });
}
export function featuredWorkouts(workouts: Workout[], studentId: string, library = emptyLibrary) {
  const groups = libraryGroups(workouts, studentId, library).filter(
    (g) => g.status === 'active' || g.status === 'saved',
  );
  const featured = groups.find((g) => g.main);
  return featured?.days ?? groups.flatMap((g) => g.days);
}
export type LibraryAction = 'main' | 'save' | 'archive' | 'restore' | 'remove';
export function changeLibrary(library: Library, key: string, action: LibraryAction): Library {
  const entries = { ...library.entries };
  let main = library.main;
  if (action === 'main') {
    main = key;
    if (entries[key] !== 'saved') entries[key] = 'active';
  } else {
    const status = {
      save: 'saved',
      archive: 'archived',
      restore: 'active',
      remove: 'removed',
    } as const;
    entries[key] = status[action];
    if (main === key && (action === 'archive' || action === 'remove')) main = undefined;
  }
  return { main, entries };
}
