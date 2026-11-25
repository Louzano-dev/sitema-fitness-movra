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
export const nutrientSchema = z.object({
  kcal: z.number().min(0).max(10000).nullable(),
  protein: z.number().min(0).max(1000).nullable(),
  carbs: z.number().min(0).max(1000).nullable(),
  fat: z.number().min(0).max(1000).nullable(),
});
export type Nutrients = z.infer<typeof nutrientSchema>;
export const foodSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(120),
  brand: z.string().max(100),
  category: z.string(),
  per100g: nutrientSchema,
  portions: z.array(z.object({ label: z.string(), grams: z.number().positive().max(10000) })),
  source: z.string(),
  sourceId: z
    .string()
    .refine((value) => value === '' || value.startsWith('https://fdc.nal.usda.gov/food-details/'), {
      message: 'Origem nutricional não permitida.',
    }),
  ownerId: z.string().optional(),
  recipe: z
    .object({
      ingredients: z.array(z.object({ foodId: z.string(), grams: z.number().positive() })),
      yieldGrams: z.number().positive(),
    })
    .optional(),
});
export type Food = z.infer<typeof foodSchema>;
export const mealSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  date: z.iso.date(),
  name: z.string().min(2).max(100),
  note: z.string().max(500),
  favorite: z.boolean(),
  items: z.array(
    z.object({
      id: z.string(),
      foodId: z.string(),
      quantity: z.number().positive().max(10000),
      unit: z.string(),
      grams: z.number().positive().max(10000),
    }),
  ),
});
export type Meal = z.infer<typeof mealSchema>;
export const experienceSchema = z.object({
  libraries: z.record(z.string(), librarySchema).optional(),
  habits: z.record(z.string(), habitSchema).optional(),
  cardioRecords: z.array(cardioRecordSchema).optional(),
  cardioModalities: z.array(modalitySchema).optional(),
  programs: z.array(programSchema),
  versions: z.array(programSchema),
  foods: z.array(foodSchema),
  meals: z.array(mealSchema),
  preferences: z.record(z.string(), z.object({ showNumbers: z.boolean(), share: z.boolean() })),
  ages: z.record(z.string(), z.number().int().min(5).max(100)),
  favorites: z.record(z.string(), z.array(z.string())),
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
  foods: [],
  meals: [],
  preferences: {},
  ages: { ana: 30, bruno: 35, clara: 16 },
  favorites: {},
  exerciseFavorites: [],
  recentExercises: [],
  assignments: [],
});

export function gramsFor(food: Food, quantity: number, unit: string): number {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 10000)
    throw new Error('Informe uma quantidade válida.');
  if (unit === 'g') return quantity;
  const portion = food.portions.find((p) => p.label === unit);
  if (!portion)
    throw new Error('Esta medida não tem conversão verificada para o alimento. Use gramas.');
  return quantity * portion.grams;
}
export function foodNutrients(food: Food, grams: number): Nutrients {
  if (!Number.isFinite(grams) || grams <= 0) throw new Error('Quantidade em gramas inválida.');
  return Object.fromEntries(
    Object.entries(food.per100g).map(([key, value]) => [
      key,
      value === null ? null : (value * grams) / 100,
    ]),
  ) as Nutrients;
}
export function totalNutrients(items: Nutrients[]): { values: Nutrients; partial: boolean } {
  const keys = ['kcal', 'protein', 'carbs', 'fat'] as const;
  const partial = items.some((item) => keys.some((key) => item[key] === null));
  // Unknown components stay unknown; known subtotal is deliberately not presented as complete.
  return {
    values: Object.fromEntries(
      keys.map((key) => [
        key,
        items.some((item) => item[key] === null)
          ? null
          : items.reduce((sum, item) => sum + (item[key] ?? 0), 0),
      ]),
    ) as Nutrients,
    partial,
  };
}
export function mealNutrients(meal: Meal, foods: Food[]) {
  return totalNutrients(
    meal.items.map((item) => {
      const food = foods.find((f) => f.id === item.foodId);
      return food
        ? foodNutrients(food, item.grams)
        : { kcal: null, protein: null, carbs: null, fat: null };
    }),
  );
}
