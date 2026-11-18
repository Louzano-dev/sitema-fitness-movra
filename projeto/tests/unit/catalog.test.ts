import { it, expect } from 'vitest';
import { EXERCISES, GENERATOR_EXERCISES } from '@/domain/exercise-catalog';
import { exerciseSlug } from '@/domain/exercise-expansion';
import { MockRepository } from '@/services/mock/repository';
import { createSeed } from '@/services/mock/seed';
import { STORAGE_KEY } from '@/services/local-storage';
it('catálogo amplo sem IDs ou nomes repetidos, com equipamentos e descrições', () => {
  console.log(`Catálogo: ${EXERCISES.length} exercícios e variações.`);
  expect(EXERCISES.length).toBeGreaterThan(200);
  expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
  expect(new Set(EXERCISES.map((e) => exerciseSlug(e.name))).size).toBe(EXERCISES.length);
  expect(EXERCISES.every((e) => e.requires.length && e.instructions && e.technical)).toBe(true);
  expect(GENERATOR_EXERCISES).toHaveLength(22);
});
it('restaura dados antigos sem perder fichas e adiciona exercícios novos ao repositório', () => {
  const seed = createSeed();
  seed.exercises = GENERATOR_EXERCISES;
  const store = new Map<string, string>();
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
  };
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, state: seed }));
  const restored = new MockRepository(seed);
  restored.attachStorage(storage);
  expect(restored.getSnapshot().exercises).toHaveLength(EXERCISES.length);
  expect(restored.getSnapshot().workouts).toEqual(seed.workouts);
});
