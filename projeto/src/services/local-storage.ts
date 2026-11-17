import { z } from 'zod';
import { cardioSchema } from '@/domain/cardio';
import { experienceSchema } from '@/domain/experience';
import {
  studentSchema,
  profileSchema,
  prescriptionSchema,
  measurementSchema,
  appointmentSchema,
  planSchema,
} from '@/domain/schemas';
import type { DemoState } from '@/domain/types';
const id = z.string().min(1).max(150);
const set = z.object({
  exerciseId: id,
  set: z.number().int().positive(),
  kg: z.number().nonnegative(),
  reps: z.number().int().positive(),
  done: z.boolean(),
});
export const storedStateSchema = z
  .object({
    students: z.array(
      studentSchema.extend({ id, organizationId: id, joinedAt: z.iso.date(), color: z.string() }),
    ),
    exercises: z.array(
      z.object({
        id,
        name: z.string(),
        group: z.string(),
        equipment: z.string(),
        instructions: z.string(),
      }),
    ),
    workouts: z.array(
      z.object({
        id,
        organizationId: id,
        studentId: id,
        title: z.string(),
        notes: z.string(),
        exercises: z.array(prescriptionSchema),
        updatedAt: z.iso.date(),
        programId: id.optional(),
        versionId: id.optional(),
        weekday: z.string().optional(),
        cardio: z.array(cardioSchema).optional(),
      }),
    ),
    sessions: z.array(
      z.object({
        id,
        studentId: id,
        workoutId: id,
        title: z.string(),
        date: z.iso.date(),
        duration: z.number().nonnegative(),
        sets: z.array(set),
        exerciseNames: z.record(z.string(), z.string()),
        versionId: id.optional(),
        note: z.string().optional(),
      }),
    ),
    measurements: z.array(measurementSchema.extend({ id })),
    appointments: z.array(
      appointmentSchema.extend({ id, status: z.enum(['Agendado', 'Cancelado']) }),
    ),
    plans: z.array(planSchema.extend({ id })),
    organizations: z.array(
      z.object({
        id,
        name: z.string(),
        owner: z.string(),
        planId: id,
        status: z.enum(['Ativa', 'Pausada']),
        since: z.iso.date(),
      }),
    ),
    subscriptions: z.array(
      z.object({
        id,
        organizationId: id,
        status: z.enum(['Ativa', 'Pausada']),
        renewal: z.iso.date(),
      }),
    ),
    profiles: z.object({ personal: profileSchema, aluno: profileSchema, admin: profileSchema }),
    drafts: z.record(z.string(), z.array(set)),
    experience: experienceSchema,
  })
  .refine(
    (state) =>
      state.workouts.every(
        (workout) =>
          state.students.some((s) => s.id === workout.studentId) &&
          workout.exercises.every((e) => state.exercises.some((item) => item.id === e.exerciseId)),
      ),
    { message: 'Referência de ficha inválida.' },
  );
export const STORAGE_KEY = 'movra:demo:3';
export function readLocal(storage: Pick<Storage, 'getItem'>): DemoState | null {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  if (raw.length > 8_000_000) throw new Error('Dados locais excedem o limite.');
  const envelope = z
    .object({ version: z.literal(3), state: storedStateSchema })
    .parse(JSON.parse(raw));
  return envelope.state;
}
export function writeLocal(storage: Pick<Storage, 'setItem'>, state: DemoState): void {
  const drafts = Object.fromEntries(
    Object.entries(state.drafts).filter(([, sets]) =>
      sets.every(
        (s) => Number.isFinite(s.kg) && Number.isInteger(s.reps) && s.kg >= 0 && s.reps > 0,
      ),
    ),
  );
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, state: { ...state, drafts } }));
}
