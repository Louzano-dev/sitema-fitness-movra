import type { MovraRepository } from './repository';
import {
  foodSchema,
  mealSchema,
  programSchema,
  gramsFor,
  totalNutrients,
  foodNutrients,
  type Program,
  type Food,
  type Meal,
} from '@/domain/experience';
import { FOODS } from '@/domain/foods';
import { EXERCISES } from '@/domain/exercise-catalog';
import { reviewReasons } from '@/domain/training-engine';
import type { DemoState, Environment } from '@/domain/types';
export const newId = () => crypto.randomUUID();
export function saveProgram(repository: MovraRepository, input: Program): Program {
  const previous = repository.getSnapshot().experience.programs.find((p) => p.id === input.id);
  const parsed = programSchema.parse({
    ...input,
    id: input.id || newId(),
    status: 'Rascunho',
    approvedVersion: undefined,
    approvedAt: undefined,
    revision: previous ? previous.revision + 1 : 1,
    updatedAt: new Date().toISOString(),
  });
  if (!repository.getSnapshot().students.some((s) => s.id === parsed.studentId))
    throw new Error('Selecione um aluno existente.');
  repository.updateExperience((state) => ({
    ...state,
    programs: [parsed, ...state.programs.filter((p) => p.id !== parsed.id)],
  }));
  return parsed;
}
export function approveProgram(
  repository: MovraRepository,
  id: string,
  reviewed: boolean,
): Program {
  const state = repository.getSnapshot();
  const program = state.experience.programs.find((p) => p.id === id);
  if (!program || !reviewed) throw new Error('A revisão explícita do profissional é obrigatória.');
  if (program.days.some((day) => !day.exercises.length))
    throw new Error('Adicione exercícios em todos os dias.');
  if (new Set(program.days.map((day) => day.weekday)).size !== program.days.length)
    throw new Error('Organize os dias da semana sem duplicações antes de aprovar.');
  if (
    program.days.some((day) =>
      day.exercises.some((row) => !EXERCISES.some((e) => e.id === row.exerciseId)),
    )
  )
    throw new Error('Há exercícios sem catálogo.');
  const age = state.experience.ages[program.studentId];
  if (
    (age === undefined ||
      age < 18 ||
      age >= 65 ||
      (program.questionnaire && reviewReasons(program.questionnaire).length > 0)) &&
    !program.supervised
  )
    throw new Error('Este contexto exige planejamento manual supervisionado específico.');
  const approved = programSchema.parse({
    ...program,
    status: 'Aprovado',
    approvedVersion: `${id}.v${program.revision}.${Date.now()}`,
    approvedAt: new Date().toISOString(),
  });
  repository.updateExperience((state) => ({
    ...state,
    programs: state.programs.map((p) => (p.id === id ? approved : p)),
    versions: [structuredClone(approved), ...state.versions],
  }));
  return approved;
}
export function foodsFor(state: DemoState, studentId: string): Food[] {
  return [...FOODS, ...state.experience.foods.filter((f) => f.ownerId === studentId)];
}
export function sharedMeals(state: DemoState, role: Environment, studentId: string): Meal[] {
  if (role === 'admin' || (role === 'personal' && !state.experience.preferences[studentId]?.share))
    return [];
  return state.experience.meals.filter((m) => m.studentId === studentId);
}
export function saveMeal(repository: MovraRepository, input: Meal, studentId: string): Meal {
  if (input.studentId !== studentId) throw new Error('Identidade da refeição divergente.');
  const foods = foodsFor(repository.getSnapshot(), studentId);
  const parsed = mealSchema.parse({
    ...input,
    id: input.id || newId(),
    items: input.items.map((item) => {
      const food = foods.find((f) => f.id === item.foodId);
      if (!food) throw new Error('Alimento não disponível para este perfil.');
      return { ...item, id: item.id || newId(), grams: gramsFor(food, item.quantity, item.unit) };
    }),
  });
  repository.updateExperience((state) => ({
    ...state,
    meals: [parsed, ...state.meals.filter((m) => m.id !== parsed.id)],
  }));
  return parsed;
}
export function saveFood(
  repository: MovraRepository,
  input: Food,
  studentId: string,
  referenceGrams = 100,
): Food {
  if (!Number.isFinite(referenceGrams) || referenceGrams <= 0)
    throw new Error('Porção de referência inválida.');
  const per100g = Object.fromEntries(
    Object.entries(input.per100g).map(([key, value]) => [
      key,
      value === null ? null : (value * 100) / referenceGrams,
    ]),
  );
  const food = foodSchema.parse({
    ...input,
    id: input.id || newId(),
    ownerId: studentId,
    per100g,
    source: 'Informado pelo usuário · sem validação externa',
    sourceId: '',
  });
  repository.updateExperience((state) => ({
    ...state,
    foods: [food, ...state.foods.filter((f) => f.id !== food.id)],
  }));
  return food;
}
export function recipeFood(
  foods: Food[],
  ingredients: { foodId: string; grams: number }[],
  yieldGrams: number,
  name: string,
): Food {
  if (!ingredients.length || !Number.isFinite(yieldGrams) || yieldGrams <= 0)
    throw new Error('Informe ingredientes e peso final medido da receita.');
  const total = totalNutrients(
    ingredients.map((item) => {
      const food = foods.find((f) => f.id === item.foodId);
      if (!food) throw new Error('Ingrediente não encontrado.');
      return foodNutrients(food, item.grams);
    }),
  );
  return {
    id: '',
    name,
    brand: '',
    category: 'Preparações',
    source: 'Receita do usuário',
    sourceId: '',
    portions: [{ label: 'Receita completa', grams: yieldGrams }],
    per100g: Object.fromEntries(
      Object.entries(total.values).map(([key, value]) => [
        key,
        value === null ? null : (value * 100) / yieldGrams,
      ]),
    ) as Food['per100g'],
    recipe: { ingredients, yieldGrams },
  };
}
