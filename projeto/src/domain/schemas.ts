import { z } from 'zod';
const name = z
  .string()
  .trim()
  .min(2, 'Informe pelo menos 2 caracteres.')
  .max(100, 'Use até 100 caracteres.');
export const studentSchema = z.object({
  name,
  email: z.email('Informe um e-mail válido.').toLowerCase(),
  goal: z.string().trim().min(3, 'Descreva o objetivo.').max(300),
  status: z.enum(['Ativo', 'Pausado']),
});
export type StudentInput = z.infer<typeof studentSchema>;
export const prescriptionSchema = z.object({
  kg: z.number().min(0).max(1000).optional(),
  exerciseId: z.string().min(1, 'Selecione um exercício.'),
  sets: z.number().int().min(1).max(10),
  reps: z.number().int().min(1).max(100),
  rest: z.number().int().min(0).max(600),
});
export const workoutSchema = z
  .object({
    studentId: z.string().min(1, 'Selecione um aluno.'),
    title: name,
    notes: z.string().trim().max(1000),
    exercises: z.array(prescriptionSchema).min(1, 'Adicione ao menos um exercício.').max(20),
  })
  .refine((v) => new Set(v.exercises.map((e) => e.exerciseId)).size === v.exercises.length, {
    message: 'Um exercício não pode aparecer duas vezes no mesmo treino.',
    path: ['exercises'],
  });
export type WorkoutInput = z.infer<typeof workoutSchema>;
export const appointmentSchema = z.object({
  studentId: z.string().min(1),
  date: z.iso.date(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido.'),
  duration: z.number().int().min(15).max(180),
  kind: z.enum(['Presencial', 'Online']),
});
export type AppointmentInput = z.infer<typeof appointmentSchema>;
export const measurementSchema = z.object({
  studentId: z.string().min(1),
  date: z.iso.date(),
  weight: z.number().positive('Informe um valor positivo.').max(500),
  waist: z.number().positive().max(300),
});
export type MeasurementInput = z.infer<typeof measurementSchema>;
export const profileSchema = z.object({
  name,
  email: z.email('Informe um e-mail válido.'),
  specialty: z.string().trim().max(150),
  notifications: z.boolean(),
});
export const planSchema = z.object({
  name,
  limit: z.number().int().min(1).max(10000),
  description: z.string().trim().min(3).max(250),
});
export function errorMessage(error: unknown) {
  return error instanceof z.ZodError
    ? (error.issues[0]?.message ?? 'Revise os campos.')
    : error instanceof Error
      ? error.message
      : 'Não foi possível atualizar a demonstração.';
}
