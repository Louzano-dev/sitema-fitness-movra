import { describe, expect, test } from 'vitest';
import { CARDIO_CATALOG, makeCardio, type CardioRecord } from '@/domain/cardio';
import { newRoutine } from '@/domain/habits';
import { workoutShare } from '@/domain/workout-share';
import { createSeed } from '@/services/mock/seed';

describe('dados do MOVRA Share', () => {
  test('usa o registro persistido do aluno e conta apenas séries concluídas', () => {
    const data = createSeed();
    const session = data.sessions[0];
    session.sets.push(
      { ...session.sets[0] },
      { ...session.sets[0], exerciseId: 'sem-registro', done: false },
    );
    const source = { kind: 'workout' as const, session: { ...session, duration: 100 } };
    expect(workoutShare(data, session.studentId, source)).toMatchObject({
      modality: 'Musculação',
      title: session.title,
      metrics: [
        { id: 'duration', value: '42 min' },
        { id: 'exercises', value: '2' },
        { id: 'sets', value: '2' },
      ],
    });
    expect(workoutShare(data, 'outro-aluno', source)).toBeUndefined();
  });

  test('oculta distância, ritmo e campos privados quando a distância está ausente', () => {
    const data = createSeed();
    const record: CardioRecord = {
      id: 'cardio-1',
      workoutId: 'treino-a',
      studentId: 'ana',
      versionId: 'v1',
      date: '2026-11-23',
      seconds: 1200,
      prescription: makeCardio(CARDIO_CATALOG[3], 'prescrição'),
      notes: 'Localização particular',
      rpe: 8,
    };
    data.experience.cardioRecords = [record];
    const source = { kind: 'cardio' as const, record };
    expect(workoutShare(data, 'ana', source)).toEqual({
      modality: 'Corrida ao ar livre',
      title: undefined,
      metrics: [{ id: 'duration', label: 'Duração', value: '20 min' }],
    });
    record.distance = 3.25;
    expect(workoutShare(data, 'ana', source)?.metrics.slice(1)).toEqual([
      { id: 'distance', label: 'Distância', value: '3,25 km' },
      { id: 'pace', label: 'Ritmo', value: '6:09 /km' },
    ]);
  });

  test('preserva a conclusão manual sem supor exercícios e usa a semana do registro', () => {
    const data = createSeed();
    const session = {
      ...data.sessions[0],
      id: 'manual',
      workoutId: 'independente',
      source: 'manual' as const,
      title: 'Mobilidade',
      date: '2026-11-23',
      completedAt: '2026-11-23T12:00:00Z',
      sets: [],
      duration: 12,
    };
    data.sessions = [
      session,
      { ...session, id: 'future', date: '2026-11-26', completedAt: '2026-11-26T12:00:00Z' },
    ];
    data.experience.habits = {
      [session.studentId]: {
        ...newRoutine('America/Sao_Paulo'),
        plans: [{ from: '2026-11-23', weekdays: [0, 3] }],
      },
    };
    const source = { kind: 'workout' as const, session };
    expect(workoutShare(data, session.studentId, source)).toMatchObject({
      modality: 'Atividade física',
      title: 'Mobilidade',
      metrics: [{ id: 'duration', value: '12 min' }],
      habits: { weekly: 1, target: 2, streak: 1 },
    });
    data.experience.habits[session.studentId].visible = false;
    expect(workoutShare(data, session.studentId, source)?.habits).toBeUndefined();
  });
});
