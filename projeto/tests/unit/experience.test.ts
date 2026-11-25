import { describe, it, expect } from 'vitest';
import { generateProgram, RULE_VERSION } from '@/domain/training-engine';
import { EXERCISES } from '@/domain/exercise-catalog';
import { FOODS } from '@/domain/foods';
import {
  gramsFor,
  foodNutrients,
  totalNutrients,
  type Questionnaire,
  type Food,
  type Meal,
} from '@/domain/experience';
import { MockRepository } from '@/services/mock/repository';
import {
  approveProgram,
  saveProgram,
  saveFood,
  saveMeal,
  sharedMeals,
  PERSONAL_FUEL_ID,
  recipeFood,
} from '@/services/experience-service';
import { STORAGE_KEY } from '@/services/local-storage';
const q: Questionnaire = {
  studentId: 'ana',
  age: 30,
  experience: 'Até um ano',
  level: 'Iniciante',
  goal: 'Condicionamento geral',
  frequency: 3,
  minutes: 40,
  days: ['Segunda', 'Quarta', 'Sexta'],
  location: 'Casa',
  coaching: 'Online',
  equipment: ['Peso corporal', 'Halteres', 'Banco', 'Polias'],
  excluded: [],
  avoidPatterns: [],
  notes: '',
  specialContext: false,
  split: 'Full body',
};
function proposal(input = q) {
  const result = generateProgram(input);
  if (result.kind !== 'proposal') throw new Error(result.reasons.join(' '));
  return result.program;
}
const rice = FOODS.find((food) => food.id === 'usda-168878')!;
const emptyFood: Food = {
  id: '',
  name: 'Alimento do rótulo',
  brand: 'Marca fictícia',
  category: 'Outros',
  source: '',
  sourceId: '',
  per100g: { kcal: 100, protein: 10, carbs: 5, fat: 2 },
  portions: [{ label: 'Porção', grams: 30 }],
};
function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
describe('Studio · regras e versões', () => {
  it('gera adulto iniciante de forma determinística e sem inferir carga', () => {
    const first = proposal();
    const second = proposal();
    expect(first.days).toEqual(second.days);
    expect(first.id).not.toBe(second.id);
    expect(first.ruleVersion).toBe(RULE_VERSION);
    expect(first.days).toHaveLength(3);
    expect(
      first.days
        .flatMap((day) => day.exercises)
        .every((row) => row.kg === undefined && row.sets === 2),
    ).toBe(true);
  });
  it('usa nível intermediário informado, sem depender apenas da idade', () => {
    expect(
      proposal({ ...q, level: 'Intermediário', experience: 'Mais de um ano' }).days[0].exercises[0]
        .sets,
    ).toBe(3);
    expect(proposal({ ...q, age: 50 }).days[0].exercises[0].sets).toBe(2);
    expect(proposal({ ...q, age: 70 }).days).toEqual(proposal(q).days);
  });
  it('organiza frequência e dias na ordem semanal', () => {
    const result = proposal({ ...q, frequency: 2, days: ['Sexta', 'Segunda'] });
    expect(result.days.map((day) => day.weekday)).toEqual(['Segunda', 'Sexta']);
  });
  it('rejeita frequência sem dias correspondentes e duplicados', () => {
    expect(() => proposal({ ...q, frequency: 2 })).toThrow();
    expect(() => proposal({ ...q, days: ['Segunda', 'Segunda', 'Sexta'] })).toThrow();
  });
  it('respeita equipamentos, exercícios excluídos e padrões evitados', () => {
    const result = proposal({
      ...q,
      equipment: ['Peso corporal', 'Elásticos'],
      excluded: ['abdominal'],
      avoidPatterns: ['Elevar'],
    });
    for (const row of result.days.flatMap((day) => day.exercises)) {
      const exercise = EXERCISES.find((e) => e.id === row.exerciseId)!;
      expect(exercise.requires.every((r) => ['Peso corporal', 'Elásticos'].includes(r))).toBe(true);
      expect(row.exerciseId).not.toBe('abdominal');
      expect(exercise.pattern).not.toBe('Elevar');
    }
  });
  it.each([
    { age: 16 },
    { specialContext: true },
    { notes: 'Dor relevante no movimento' },
    { notes: 'Gravidez' },
    { level: 'Avançado', experience: 'Sem experiência' },
    { frequency: 7, days: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'] },
  ])('exige revisão e não gera ficha para %j', (patch) => {
    expect(generateProgram({ ...q, ...patch } as Questionnaire).kind).toBe('review');
  });
  it('não finge encontrar exercícios quando o catálogo é insuficiente', () => {
    expect(generateProgram({ ...q, equipment: ['Outros'] }).kind).toBe('review');
  });
  it('regeneração é determinística e separada do rascunho editado', () => {
    const current = proposal();
    current.days[0].exercises[0].sets = 5;
    const changed = generateProgram(q, 1);
    expect(changed.kind).toBe('proposal');
    expect(current.days[0].exercises[0].sets).toBe(5);
    const again = generateProgram(q,1);
    if (changed.kind !== 'proposal' || again.kind !== 'proposal') throw Error('Proposta esperada');
    expect(again.program.days).toEqual(changed.program.days);
  });
  it('impede atribuição sem revisão explícita e mantém versões imutáveis', async () => {
    const repository = new MockRepository();
    const draft = saveProgram(repository, proposal());
    await expect(repository.assignProgram(draft.id)).rejects.toThrow('aprove');
    expect(() => approveProgram(repository, draft.id, false)).toThrow('revisão');
    const approved = approveProgram(repository, draft.id, true);
    const before = structuredClone(repository.getSnapshot().experience.versions);
    const ids = await repository.assignProgram(draft.id);
    expect(ids).toHaveLength(3);
    expect(repository.getSnapshot().workouts.find((w) => w.id === ids[0])?.versionId).toBe(
      approved.approvedVersion,
    );
    saveProgram(repository, { ...approved, title: 'Proposta modificada' });
    expect(repository.getSnapshot().experience.versions).toEqual(before);
    await expect(repository.assignProgram(draft.id)).rejects.toThrow();
  });
  it.each([16, undefined])('ficha manual exige supervisão para idade %s', (age) => {
    const repository = new MockRepository();
    repository.updateExperience((state) => {
      const ages = { ...state.ages };
      if (age === undefined) delete ages.ana;
      else ages.ana = age;
      return { ...state, ages };
    });
    const manual = saveProgram(repository, { ...proposal(), questionnaire: undefined });
    expect(() => approveProgram(repository, manual.id, true)).toThrow('supervisionado');
    const supervised = saveProgram(repository, { ...manual, supervised: true });
    expect(approveProgram(repository, supervised.id, true).status).toBe('Aprovado');
  });
  it.each([false, true])('bloqueia conflitos na aprovação com supervisão %s', (supervised) => {
    const repository = new MockRepository();
    const program = proposal();
    const row = program.days[0].exercises[0];
    program.questionnaire!.excluded = [row.exerciseId];
    row.sets = 10;
    row.rest = 600;
    const draft = saveProgram(repository, { ...program, supervised });
    expect(() => approveProgram(repository, draft.id, true)).toThrow(/exclusões.*duração/);
    expect(repository.getSnapshot().experience.versions).toHaveLength(0);
    expect(repository.getSnapshot().experience.programs.find((p) => p.id === draft.id)?.status).toBe('Rascunho');
  });
  it('valida exercícios próprios e itens ausentes também em fichas manuais', () => {
    const repository = new MockRepository();
    const program = proposal();
    const ownId = repository.saveOwnExercise({
      ...EXERCISES[0], name: 'Agachamento adaptado', equipment: 'Máquinas',
    });
    const day = program.days[0];
    const row = { ...day.exercises[0], exerciseId: ownId };
    const draft = saveProgram(repository, {
      ...program, days: [{ ...day, exercises: [row] }], supervised: true,
    });
    expect(() => approveProgram(repository, draft.id, true)).toThrow(/equipamentos/);
    const manual = saveProgram(repository, { ...draft, questionnaire: undefined });
    expect(approveProgram(repository, manual.id, true).status).toBe('Aprovado');
    const unknown = saveProgram(repository, {
      ...manual, days: [{ ...day, exercises: [{ ...row, exerciseId: 'own-ausente' }] }],
    });
    expect(() => approveProgram(repository, unknown.id, true)).toThrow(/ausente na biblioteca/);
  });
  it('executa exercício duplicado sem colisão e preserva sessão após nova versão', async () => {
    const repository = new MockRepository();
    const input = proposal({ ...q, frequency: 1, days: ['Segunda'] });
    const row = input.days[0].exercises[0];
    input.days[0].exercises = [row, { ...row, id: 'duplicado' }];
    const draft = saveProgram(repository, input);
    const approved = approveProgram(repository, draft.id, true);
    const [workoutId] = await repository.assignProgram(draft.id);
    const workout = repository.getSnapshot().workouts.find((w) => w.id === workoutId)!;
    expect(new Set(workout.exercises.map((e) => e.exerciseId)).size).toBe(2);
    repository.saveDraft(
      workoutId,
      workout.exercises.flatMap((e) =>
        Array.from({ length: e.sets }, (_, i) => ({
          exerciseId: e.exerciseId,
          set: i + 1,
          kg: 10,
          reps: e.reps,
          done: true,
        })),
      ),
    );
    const sessionId = await repository.finishWorkout(workoutId, 20, 'ana', 'Registro fictício');
    const session = structuredClone(
      repository.getSnapshot().sessions.find((s) => s.id === sessionId),
    );
    saveProgram(repository, { ...approved, title: 'Outra revisão' });
    expect(repository.getSnapshot().sessions.find((s) => s.id === sessionId)).toEqual(session);
  });
});
describe('Fuel · quantidades, origem e privacidade', () => {
  it('Personal tem diário próprio e não recebe dados de alunos por consentimento antigo', () => {
    const repository = new MockRepository();
    saveMeal(
      repository,
      {
        id: '',
        studentId: PERSONAL_FUEL_ID,
        date: '2026-11-12',
        name: 'Lanche',
        note: '',
        favorite: false,
        items: [{ id: 'item', foodId: rice.id, quantity: 100, unit: 'g', grams: 100 }],
      },
      PERSONAL_FUEL_ID,
    );
    expect(sharedMeals(repository.getSnapshot(), 'personal', PERSONAL_FUEL_ID)).toHaveLength(1);
    expect(sharedMeals(repository.getSnapshot(), 'aluno', 'ana')).toEqual([]);
    expect(sharedMeals(repository.getSnapshot(), 'aluno', PERSONAL_FUEL_ID)).toEqual([]);
    expect(sharedMeals(repository.getSnapshot(), 'admin', PERSONAL_FUEL_ID)).toEqual([]);
  });
  it('usa arroz USDA verificado: 150 g equivalem a 195 kcal', () => {
    expect(rice.per100g.kcal).toBe(130);
    expect(foodNutrients(rice, 150).kcal).toBe(195);
    expect(rice.sourceId).toContain('168878');
  });
  it('converte porção específica, sem tratar ml como g', () => {
    expect(gramsFor(emptyFood, 2, 'Porção')).toBe(60);
    expect(() => gramsFor(emptyFood, 200, 'ml')).toThrow('conversão');
    expect(() => gramsFor(emptyFood, -1, 'g')).toThrow();
  });
  it('mantém nutrientes desconhecidos como estimativa parcial', () => {
    const result = totalNutrients([
      { kcal: 100, protein: 10, carbs: null, fat: 1 },
      { kcal: 50, protein: 5, carbs: 20, fat: 2 },
    ]);
    expect(result.values).toEqual({ kcal: 150, protein: 15, carbs: null, fat: 3 });
    expect(result.partial).toBe(true);
  });
  it('normaliza rótulo por porção sem inventar informação ausente', () => {
    const repository = new MockRepository();
    const food = saveFood(
      repository,
      { ...emptyFood, per100g: { ...emptyFood.per100g, carbs: null } },
      'ana',
      50,
    );
    expect(food.per100g.kcal).toBe(200);
    expect(food.per100g.carbs).toBeNull();
    expect(food.ownerId).toBe('ana');
    expect(food.source).toContain('usuário');
  });
  it('valida números e referência de alimento personalizado', () => {
    const repository = new MockRepository();
    expect(() => saveFood(repository, emptyFood, 'ana', 0)).toThrow();
    expect(() =>
      saveFood(repository, { ...emptyFood, per100g: { ...emptyFood.per100g, kcal: -10 } }, 'ana'),
    ).toThrow();
  });
  it('calcula receita com rendimento final distinto do peso cru', () => {
    const recipe = recipeFood([rice], [{ foodId: rice.id, grams: 100 }], 200, 'Receita teste');
    expect(recipe.per100g.kcal).toBe(65);
    expect(() => recipeFood([rice], [], 200, 'Vazia')).toThrow();
  });
  it('isola alimentos próprios e refeições por identidade', () => {
    const repository = new MockRepository();
    const food = saveFood(repository, emptyFood, 'ana');
    const meal: Meal = {
      id: '',
      studentId: 'bruno',
      date: '2026-11-12',
      name: 'Almoço',
      note: '',
      favorite: false,
      items: [{ id: 'item', foodId: food.id, quantity: 100, unit: 'g', grams: 100 }],
    };
    expect(() => saveMeal(repository, meal, 'ana')).toThrow('Identidade');
    expect(() => saveMeal(repository, meal, 'bruno')).toThrow('disponível');
  });
  it('compartilha somente com consentimento e revoga imediatamente', () => {
    const repository = new MockRepository();
    saveMeal(
      repository,
      {
        id: '',
        studentId: 'ana',
        date: '2026-11-12',
        name: 'Almoço',
        note: '',
        favorite: false,
        items: [{ id: 'item', foodId: rice.id, quantity: 150, unit: 'g', grams: 999 }],
      },
      'ana',
    );
    expect(repository.getSnapshot().experience.meals[0].items[0].grams).toBe(150);
    expect(sharedMeals(repository.getSnapshot(), 'personal', 'ana')).toEqual([]);
    repository.updateExperience((state) => ({
      ...state,
      preferences: { ana: { showNumbers: true, share: true } },
    }));
    expect(sharedMeals(repository.getSnapshot(), 'personal', 'ana')).toEqual([]);
    expect(sharedMeals(repository.getSnapshot(), 'personal', 'bruno')).toEqual([]);
    expect(sharedMeals(repository.getSnapshot(), 'admin', 'ana')).toEqual([]);
    repository.updateExperience((state) => ({
      ...state,
      preferences: { ana: { showNumbers: true, share: false } },
    }));
    expect(sharedMeals(repository.getSnapshot(), 'personal', 'ana')).toEqual([]);
  });
});
describe('Persistência local versionada', () => {
  it('restaura uma ficha parcialmente preenchida com as séries já concluídas e o tempo ativo', () => {
    const storage = memoryStorage();
    const repository = new MockRepository();
    repository.attachStorage(storage);
    const sets = [
      { exerciseId: 'remada', set: 1, kg: 10, reps: 8, done: true },
      { exerciseId: 'remada', set: 2, kg: NaN, reps: 8, done: false },
    ];
    repository.saveDraft('treino-a', sets);
    repository.saveWorkoutCheckpoint('treino-a', { elapsedMs: 12345, previousCardioIds: [] });
    const next = new MockRepository();
    next.attachStorage(storage);
    expect(next.getSnapshot().drafts['treino-a']).toEqual(sets);
    expect(next.getSnapshot().workoutCheckpoints?.['treino-a'].elapsedMs).toBe(12345);
    next.reset();
    expect(next.getSnapshot().workoutCheckpoints).toEqual({});
  });
  it('restaura fichas, refeições e histórico em uma nova instância', async () => {
    const storage = memoryStorage();
    const repository = new MockRepository();
    repository.attachStorage(storage);
    const draft = saveProgram(repository, proposal());
    approveProgram(repository, draft.id, true);
    await repository.assignProgram(draft.id);
    saveMeal(
      repository,
      {
        id: '',
        studentId: 'ana',
        date: '2026-11-12',
        name: 'Jantar',
        note: '',
        favorite: false,
        items: [{ id: 'item', foodId: rice.id, quantity: 100, unit: 'g', grams: 100 }],
      },
      'ana',
    );
    const restored = new MockRepository();
    restored.attachStorage(storage);
    expect(restored.getSnapshot().experience.programs[0].status).toBe('Atribuído');
    expect(restored.getSnapshot().experience.meals[0].name).toBe('Jantar');
    expect(restored.getSnapshot().workouts).toEqual(repository.getSnapshot().workouts);
  });
  it('tolera corrupção e armazena reset explícito', () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, '{"version":3,"state":{}}');
    const repository = new MockRepository();
    repository.attachStorage(storage);
    expect(repository.getSnapshot().storageState).toBe('invalid');
    repository.reset();
    const restored = new MockRepository();
    restored.attachStorage(storage);
    expect(restored.getSnapshot().storageState).toBe('local');
    expect(restored.getSnapshot().experience.meals).toEqual([]);
  });
  it('continua utilizável quando o navegador nega gravação', () => {
    const repository = new MockRepository();
    repository.attachStorage({
      getItem: () => null,
      setItem: () => {
        throw new Error('Blocked');
      },
    });
    expect(repository.getSnapshot().storageState).toBe('unavailable');
    saveProgram(repository, proposal());
    expect(repository.getSnapshot().experience.programs).toHaveLength(1);
  });
});
