import { expect, it } from 'vitest';
import { estimateDay, movements, weekVolume } from '@/domain/training-plan';
import { generateProgram, regenerateDays } from '@/domain/training-engine';
import { EQUIPMENT, type Questionnaire } from '@/domain/experience';

const profile: Questionnaire = {
  studentId: 'ana',
  age: 32,
  level: 'Intermediário',
  experience: 'Mais de um ano',
  goal: 'Hipertrofia',
  frequency: 3,
  minutes: 60,
  days: ['Segunda', 'Quarta', 'Sexta'],
  location: 'Academia',
  coaching: 'Presencial',
  equipment: [...EQUIPMENT],
  excluded: [],
  avoidPatterns: [],
  notes: '',
  specialContext: false,
  split: 'A/B/C',
};
function program(patch: Partial<Questionnaire> = {}) {
  const result = generateProgram({ ...profile, ...patch });
  if (result.kind !== 'proposal') throw Error(result.reasons.join(' '));
  return result.program;
}
it('A/B/C de 60 minutos gera três sessões completas sem exercícios duplicados', () => {
  const sizes = program().days.map((d) => d.exercises.length);
  expect(sizes).toHaveLength(3);
  expect(
    sizes.every((n) => n >= 5 && n <= 8),
    JSON.stringify(sizes),
  ).toBe(true);
  for (const day of program().days)
    expect(new Set(day.exercises.map((e) => e.exerciseId)).size).toBe(day.exercises.length);
});

it.each([
  ['Iniciante', 'Full body', 3, 60],
  ['Intermediário', 'A/B/C', 3, 45],
  ['Avançado', 'Upper/Lower', 4, 60],
  ['Intermediário', 'A/B', 4, 45],
  ['Intermediário', 'Push/Pull/Legs', 3, 60],
  ['Intermediário', 'Superior/inferior', 4, 60],
] as const)('programa %s · %s em %i dias', (level, split, frequency, minutes) => {
  const days =
    frequency === 4
      ? (['Segunda', 'Terça', 'Quinta', 'Sexta'] as const)
      : (['Segunda', 'Quarta', 'Sexta'] as const);
  const p = program({ level, split, frequency, minutes, days: [...days] });
  expect(p.days).toHaveLength(frequency);
  expect(new Set(p.days.map((d) => d.exercises.map((r) => r.exerciseId).join(','))).size).toBe(
    frequency,
  );
  for (const day of p.days) {
    expect(day.exercises.length).toBeGreaterThanOrEqual(4);
    expect(estimateDay(day).minutes).toBeLessThanOrEqual(minutes);
  }
  expect(Object.values(weekVolume(p.days)).reduce((a, b) => a + b, 0)).toBe(
    p.days.reduce((s, d) => s + estimateDay(d).sets, 0),
  );
});
it('calcula execução, intervalos entre séries e transições e admite sessão compacta', () => {
  expect(estimateDay({ exercises: [{ sets: 2, reps: 10, repsMax: 12, rest: 60 }] }).strength).toBe(
    150 + 75 + 2 * 12 * 3 + 60,
  );
  for (const minutes of [15, 30]) {
    const day = program({ split: 'Full body', level: 'Iniciante', minutes }).days[0];
    expect(day.exercises.length).toBeGreaterThanOrEqual(minutes === 15 ? 2 : 3);
    expect(estimateDay(day).minutes).toBeLessThanOrEqual(minutes);
  }
});
it('aplica a divisão personalizada por dia e sinaliza restrições incompatíveis', () => {
  const days = program({
    split: 'Personalizada',
    dayFocus: { Segunda: 'Inferior', Quarta: 'Superior', Sexta: 'Mobilidade' },
  }).days;
  expect(
    days[2].exercises.every(
      (r) => movements.find((e) => e.id === r.exerciseId)?.slot === 'mobilidade',
    ),
  ).toBe(true);
  expect(generateProgram({ ...profile, equipment: ['Outros'] }).kind).toBe('review');
  expect(
    generateProgram({
      ...profile,
      excluded: movements.filter((e) => e.id !== 'supino').map((e) => e.id),
    }).kind,
  ).toBe('review');
});
it('regenera um dia preservando linhas, dias vizinhos e orçamento real', () => {
  const draft = program();
  const day = draft.days[1];
  day.exercises[0].locked = true;
  day.exercises[0].notes = 'Orientação revisada.';
  const changed = regenerateDays(draft, day.id, 1);
  expect(changed.days[0]).toEqual(draft.days[0]);
  expect(changed.days[2]).toEqual(draft.days[2]);
  expect(changed.days[1].exercises).toContainEqual(day.exercises[0]);
  expect(estimateDay(changed.days[1]).minutes).toBeLessThanOrEqual(60);
  expect(changed.days[1].exercises).not.toEqual(day.exercises);
});
it('pede revisão se a regeneração contradiz uma linha preservada', () => {
  const draft = program();
  const day = draft.days[0];
  day.exercises[0].locked = true;
  draft.questionnaire!.excluded = [day.exercises[0].exerciseId];
  expect(() => regenerateDays(draft, day.id, 1)).toThrow(/preservado/);
});
