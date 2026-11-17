import { cardioRecordSchema, type CardioRecord } from '@/domain/cardio';
import type { MovraRepository } from './repository';
export function saveCardioRecord(
  repository: MovraRepository,
  input: CardioRecord,
  studentId: string,
) {
  const record = cardioRecordSchema.parse(input);
  const state = repository.getSnapshot();
  const workout = state.workouts.find(
    (w) => w.id === record.workoutId && w.studentId === studentId,
  );
  if (
    record.studentId !== studentId ||
    !workout ||
    workout.versionId !== record.versionId ||
    !workout.cardio?.some(
      (c) =>
        c.id === record.prescription.id &&
        JSON.stringify(c) === JSON.stringify(record.prescription),
    )
  )
    throw new Error('Prescrição ou identidade divergente.');
  const previous = state.experience.cardioRecords?.find((r) => r.id === record.id);
  if (previous && (previous.studentId !== studentId || previous.workoutId !== record.workoutId))
    throw new Error('Registro de outra identidade.');
  repository.updateExperience((s) => ({
    ...s,
    cardioRecords: [
      structuredClone(record),
      ...(s.cardioRecords ?? []).filter((r) => r.id !== record.id),
    ],
  }));
}
