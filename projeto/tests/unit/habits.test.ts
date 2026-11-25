import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addDays,
  civilDate,
  completionReward,
  consistency,
  moveSession,
  newRoutine,
  pauseRoutine,
  plannedOn,
  setWeekdays,
  stages,
  type Activity,
} from '@/domain/habits';
import { MockRepository } from '@/services/mock/repository';
import { readLocal, STORAGE_KEY, writeLocal } from '@/services/local-storage';

const monday = '2026-11-02';
const week = setWeekdays(newRoutine('America/Sao_Paulo'), [0, 1, 2, 3], monday);
const done = (day: number, extra = false): Activity => ({
  date: addDays(monday, day),
  completedAt: addDays(monday, day) + 'T14:00:00Z',
  extra,
});
const four = [0, 1, 2, 3].map((day) => done(day));
afterEach(() => vi.useRealTimers());

describe('Constância de treinos programados', () => {
  it('preserva quatro sessões durante três dias de descanso e soma a quinta segunda-feira', () => {
    for (const n of [3, 4, 5, 6]) {
      expect(consistency(week, four, addDays(monday, n))).toMatchObject({
        streak: 4,
        weekly: 4,
        target: 4,
      });
    }
    const next = consistency(week, [...four, done(7)], addDays(monday, 7));
    expect(next).toMatchObject({
      streak: 5,
      bestStreak: 5,
      weekStreak: 1,
      goalWeeks: 1,
      weekly: 1,
      stage: 1,
      next: addDays(monday, 8),
    });
  });
  it('não pontua visitas, exemplos, sessões extras nem múltiplos registros do mesmo compromisso', () => {
    expect(consistency(week, [{ date: monday }], monday).weekly).toBe(0);
    const activity = [done(0, true), done(1), done(1)];
    expect(consistency(week, activity, addDays(monday, 2))).toMatchObject({ weekly: 1, streak: 1 });
    expect(consistency(week, activity, addDays(monday, 3)).streak).toBe(0);
    expect(consistency(week, activity, addDays(monday, 3)).bestStreak).toBe(1);
  });
  it('mantém compromissos passados, mesmo após editar os dias ou cancelar a pausa', () => {
    const edited = setWeekdays(week, [4], addDays(monday, 2));
    expect([0, 1, 2, 3, 4].map((n) => plannedOn(edited, addDays(monday, n)))).toEqual([
      true,
      true,
      true,
      false,
      true,
    ]);
    const paused = pauseRoutine(
      edited,
      addDays(monday, 4),
      addDays(monday, 14),
      addDays(monday, 3),
      four,
    );
    expect(consistency(paused, four, addDays(monday, 14))).toMatchObject({
      streak: 3,
      weekStreak: 1,
      stage: 1,
      next: addDays(monday, 18),
    });
    expect(() => pauseRoutine(week, monday, addDays(monday, 3), monday, four)).toThrow();
  });
  it('desbloqueia os cinco estágios e conquistas somente no fechamento das semanas correspondentes', () => {
    const routine = setWeekdays(newRoutine('UTC'), [0], monday);
    const workouts = Array.from({ length: 12 }, (_, i) => done(i * 7));
    for (const [stage, { weeks }] of stages.entries()) {
      const progress = consistency(routine, workouts, addDays(monday, weeks * 7));
      expect(progress).toMatchObject({ goalWeeks: weeks, stage });
      if (stage) {
        expect(consistency(routine, workouts, addDays(monday, weeks * 7 - 1)).stage).toBe(
          stage - 1,
        );
        expect(progress.achievements.at(-1)).toMatchObject({
          id: 'weeks-' + weeks,
          date: addDays(monday, weeks * 7),
        });
      }
    }
    expect(consistency(routine, [done(1), { date: monday }], monday).achievements).toEqual([]);
  });
  it('compara as atividades efetivamente salvas, inclusive ao repetir conclusões e registrar extras', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(monday + 'T12:00:00Z'));
    const repo = new MockRepository();
    repo.updateExperience((s) => ({ ...s, habits: { ana: week } }));
    const before = repo.getSnapshot();
    const id = await repo.finishWorkout('treino-a', 20, 'ana', '', 'manual');
    const saved = repo.getSnapshot();
    expect(completionReward(before, saved, 'ana', id)).toMatchObject({
      id,
      advanced: true,
      stage: 0,
      weekly: 1,
      streak: 1,
      unlocked: [{ id: 'first-workout' }],
    });
    expect(completionReward(saved, saved, 'ana', id)).toBeNull();
    const extra = repo.recordIndependentWorkout('ana', 'Caminhada', 10, true);
    expect(completionReward(saved, repo.getSnapshot(), 'ana', extra)).toMatchObject({
      advanced: false,
      weekly: 1,
      streak: 1,
      unlocked: [],
    });
    expect(completionReward(before, saved, 'ana', 'id-ausente')).toBeNull();
    expect(completionReward(before, saved, 'outro', id)).toBeNull();
  });
  it('reagenda para um dia livre, permite nova alteração e rejeita conflitos, passado e treino já feito', () => {
    const rescheduled = moveSession(week, monday, addDays(monday, 4), monday, []);
    expect(plannedOn(rescheduled, monday)).toBe(false);
    expect(plannedOn(rescheduled, addDays(monday, 4))).toBe(true);
    const changed = moveSession(rescheduled, addDays(monday, 4), addDays(monday, 5), monday, []);
    expect(
      consistency(
        changed,
        [1, 2, 3, 5].map((n) => done(n)),
        addDays(monday, 6),
      ),
    ).toMatchObject({ weekly: 4, target: 4, streak: 4 });
    expect(() => moveSession(week, monday, addDays(monday, 1), monday, [])).toThrow();
    expect(() => moveSession(week, monday, addDays(monday, 4), addDays(monday, 1), [])).toThrow();
    expect(() => moveSession(week, monday, addDays(monday, 4), monday, four)).toThrow();
  });
  it('permite rotina indefinida e computa a data civil preservando o fuso e a virada do horário de verão', () => {
    expect(consistency(newRoutine('UTC'), four, monday)).toMatchObject({
      target: 0,
      streak: 0,
      next: undefined,
    });
    expect(civilDate(new Date('2026-11-02T02:00:00Z'), 'America/Sao_Paulo')).toBe('2026-11-01');
    expect(civilDate(new Date('2026-11-02T02:00:00Z'), 'Asia/Tokyo')).toBe(monday);
    expect(addDays('2026-11-01', 1)).toBe(monday);
  });
  it('registra a conclusão manual real e a atividade independente com idempotência após recarregar', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T01:00:00Z'));
    const repo = new MockRepository();
    repo.updateExperience((s) => ({ ...s, habits: { ana: { ...week, visible: false } } }));
    const id = await repo.finishWorkout('treino-a', 12, 'ana', '', 'manual');
    expect(repo.getSnapshot().sessions.find((s) => s.id === id)).toMatchObject({
      date: monday,
      source: 'manual',
      completedAt: '2026-11-03T01:00:00.000Z',
      sets: [],
    });
    const independent = repo.recordIndependentWorkout('ana', 'Caminhada', 20, true);
    expect(repo.recordIndependentWorkout('ana', 'Caminhada', 20, true)).toBe(independent);
    const map = new Map<string, string>();
    writeLocal({ setItem: (k, v) => map.set(k, v) }, repo.getSnapshot());
    expect(map.has(STORAGE_KEY)).toBe(true);
    const stored = readLocal({ getItem: (k) => map.get(k) ?? null })!;
    const reopened = new MockRepository(stored);
    expect(await reopened.finishWorkout('treino-a', 12, 'ana', '', 'manual')).toBe(id);
    expect(reopened.getSnapshot().experience.habits?.ana.visible).toBe(false);
    expect(
      consistency(
        stored.experience.habits!.ana,
        stored.sessions.filter((s) => s.studentId === 'ana'),
        monday,
      ),
    ).toMatchObject({ weekly: 1, streak: 1 });
  });
});
