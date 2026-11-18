import type { Program, TrainingDay } from './experience';
import type { Workout } from './types';
import { DEMO_DATE, ORGANIZATION_ID } from './types';

export function deliverDay(program: Program, day: TrainingDay, id: string): Workout {
  return {
    id,
    organizationId: ORGANIZATION_ID,
    studentId: program.studentId,
    title: program.title + ' · ' + day.name,
    notes: day.instructions,
    weekday: day.weekday,
    updatedAt: DEMO_DATE,
    programId: program.id,
    versionId: program.approvedVersion,
    cardio: structuredClone(day.cardio ?? []),
    exercises: day.exercises.map(
      ({ id: rowId, exerciseId, sets, reps, repsMax, rest, kg, rir, rpe, notes }) => ({
        exerciseId: program.approvedVersion
          ? exerciseId + '--' + program.approvedVersion + '--' + rowId
          : exerciseId,
        rowId,
        sets,
        reps,
        repsMax,
        rest,
        kg,
        rir,
        rpe,
        notes,
      }),
    ),
  };
}
