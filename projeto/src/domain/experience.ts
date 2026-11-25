import { librarySchema } from './student-library';
import { habitSchema } from './habits';
import { z } from 'zod';
import { cardioSchema, cardioRecordSchema, modalitySchema, cardioQuestionSchema } from './cardio';

export const WEEKDAYS = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
] as const;
export const EQUIPMENT = [
  'Halteres',
  'Barra e anilhas',
  'Máquinas',
  'Polias',
  'Banco',
  'Elásticos',
  'Kettlebells',
  'Peso corporal',
  'Esteira',
  'Bicicleta ergométrica',
  'Outros',
] as const;
export const GOALS = [
  'Hipertrofia',
  'Força',
  'Condicionamento físico',
  'Resistência muscular',
  'Mobilidade',
  'Condicionamento geral',
  'Manutenção da atividade física',
] as const;
export const SPLITS = [
  'Full body',
  'A/B',
  'A/B/C',
  'Superior/inferior',
  'Upper/Lower',
  'Push/Pull/Legs',
  'Padrões de movimento',
  'Personalizada',
] as const;
export const DAY_FOCUS = [
  'Corpo inteiro',
  'Superior',
  'Inferior',
  'Empurrar',
  'Puxar',
  'Mobilidade',
] as const;
export const questionnaireSchema = z
  .object({
    studentId: z.string().min(1),
    age: z.number().int().min(5).max(100),
    experience: z.enum(['Sem experiência', 'Até um ano', 'Mais de um ano']),
    level: z.enum(['Iniciante', 'Intermediário', 'Avançado']),
    goal: z.enum(GOALS),
    frequency: z.number().int().min(1).max(7),
    minutes: z.number().int().min(15).max(120),
    days: z.array(z.enum(WEEKDAYS)).min(1).max(7),
    location: z.enum(['Academia', 'Casa', 'Estúdio']),
    coaching: z.enum(['Presencial', 'Online']),
    equipment: z.array(z.enum(EQUIPMENT)).min(1),
    excluded: z.array(z.string()),
    avoidPatterns: z.array(z.string()),
    notes: z.string().max(1000),
    specialContext: z.boolean(),
    split: z.enum(SPLITS),
    modelId: z.string().min(1).optional(),
    dayGroups: z.partialRecord(z.enum(WEEKDAYS), z.array(z.string().min(1)).max(12)).optional(),
    dayFocus: z.partialRecord(z.enum(WEEKDAYS), z.enum(DAY_FOCUS)).optional(),
    priority: z.string().max(60).optional(),
    cardio: cardioQuestionSchema.optional(),
  })
  .refine((q) => q.days.length === q.frequency && new Set(q.days).size === q.frequency, {
    message: 'Selecione dias distintos em quantidade igual à frequência.',
    path: ['days'],
  });
export type Questionnaire = z.infer<typeof questionnaireSchema>;
export const studioExerciseSchema = z
  .object({
    id: z.string(),
    exerciseId: z.string(),
    sets: z.number().int().min(1).max(10),
    reps: z.number().int().min(1).max(100),
    repsMax: z.number().int().min(1).max(100).optional(),
    rest: z.number().int().min(0).max(600),
    kg: z.number().min(0).max(1000).optional(),
    rir: z.number().int().min(0).max(10).optional(),
    rpe: z.number().min(0).max(10).optional(),
    notes: z.string().max(500),
    locked: z.boolean(),
  })
  .refine((e) => e.repsMax === undefined || e.repsMax >= e.reps, {
    message: 'O limite final deve ser maior ou igual ao inicial.',
  });
export type StudioExercise = z.infer<typeof studioExerciseSchema>;
export const daySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  weekday: z.string(),
  groups: z.array(z.string().max(60)).max(20).optional(),
  instructions: z.string().max(1000),
  exercises: z.array(studioExerciseSchema).max(20),
  cardio: z.array(cardioSchema).max(10).optional(),
});
export type TrainingDay = z.infer<typeof daySchema>;
export const programSchema = z.object({
  id: z.string(),
  title: z.string().min(2).max(100),
  studentId: z.string(),
  ruleVersion: z.string(),
  status: z.enum(['Rascunho', 'Aguardando revisão', 'Aprovado', 'Atribuído', 'Arquivado']),
  questionnaire: questionnaireSchema.optional(),
  days: z.array(daySchema).min(1).max(7),
  rationale: z.array(z.string()),
  revision: z.number().int().positive(),
  approvedVersion: z.string().optional(),
  approvedAt: z.string().optional(),
  updatedAt: z.string(),
  template: z.boolean(),
  supervised: z.boolean(),
});
export type Program = z.infer<typeof programSchema>;
export const experienceSchema = z.object({
  libraries: z.record(z.string(), librarySchema).optional(),
  habits: z.record(z.string(), habitSchema).optional(),
  cardioRecords: z.array(cardioRecordSchema).optional(),
  cardioModalities: z.array(modalitySchema).optional(),
  programs: z.array(programSchema),
  versions: z.array(programSchema),
  // Preserve values from earlier exports without loading any retired feature.
  foods: z.unknown().optional(),
  meals: z.unknown().optional(),
  preferences: z.unknown().optional(),
  favorites: z.unknown().optional(),
  ages: z.record(z.string(), z.number().int().min(5).max(100)),
  exerciseFavorites: z.array(z.string()),
  recentExercises: z.array(z.string()),
  assignments: z.array(
    z.object({
      id: z.string(),
      programId: z.string(),
      versionId: z.string(),
      studentId: z.string(),
      workoutIds: z.array(z.string()),
      date: z.string(),
    }),
  ),
});
export type ExperienceState = z.infer<typeof experienceSchema>;
export const emptyExperience = (): ExperienceState => ({
  programs: [],
  versions: [],
  ages: { ana: 30, bruno: 35, clara: 16 },
  exerciseFavorites: [],
  recentExercises: [],
  assignments: [],
});
