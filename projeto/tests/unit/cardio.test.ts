import { describe, it, expect } from 'vitest';
import {
  CARDIO_CATALOG,
  makeCardio,
  cardioSchema,
  cardioSeconds,
  cardioStages,
} from '@/domain/cardio';
import { saveProgram, approveProgram } from '@/services/experience-service';
import { saveCardioRecord } from '@/services/cardio-service';
import { MockRepository } from '@/services/mock/repository';
import { generateProgram } from '@/domain/training-engine';
import { type Program, type Questionnaire } from '@/domain/experience';
import { STORAGE_KEY } from '@/services/local-storage';
const manual = (): Program => ({
  id: '',
  title: 'Cardio revisado',
  studentId: 'ana',
  ruleVersion: 'manual/1',
  status: 'Rascunho',
  revision: 1,
  updatedAt: '',
  rationale: [],
  template: false,
  supervised: false,
  days: [
    {
      id: 'dia',
      name: 'Aeróbico',
      weekday: 'Segunda',
      instructions: '',
      exercises: [],
      cardio: [makeCardio()],
    },
  ],
});
describe('Cardio profissional', () => {
  it('oferece 14 modalidades com parâmetros específicos', () => {
    expect(CARDIO_CATALOG).toHaveLength(14);
    expect(CARDIO_CATALOG[0].parameters).toContain('incline');
    expect(CARDIO_CATALOG[4].parameters).not.toContain('incline');
  });
  it('soma blocos, repetições e ciclos', () => {
    const c = makeCardio();
    c.type = 'Intervalado';
    c.cycles = 3;
    c.blocks = [
      { id: '1', type: 'Esforço', seconds: 60, repeats: 2, intensity: 'Orientação', notes: '' },
      { id: '2', type: 'Recuperação', seconds: 30, repeats: 1, intensity: 'Orientação', notes: '' },
    ];
    expect(cardioSeconds(cardioSchema.parse(c))).toBe(450);
    expect(cardioStages(c)).toHaveLength(9);
  });
  it('rejeita duração negativa e intervalado sem recuperação', () => {
    const c = makeCardio();
    expect(cardioSchema.safeParse({ ...c, minutes: -2 }).success).toBe(false);
    expect(cardioSchema.safeParse({ ...c, type: 'Intervalado' }).success).toBe(false);
  });
  it('não exige FC mas valida faixa definida pelo profissional', () => {
    const c = makeCardio();
    expect(cardioSchema.safeParse(c).success).toBe(true);
    expect(
      cardioSchema.safeParse({
        ...c,
        method: 'Faixa cardíaca profissional',
        hrMin: 140,
        hrMax: 100,
      }).success,
    ).toBe(false);
  });
  it('aprova cardio independente e preserva snapshot, histórico e persistência', async () => {
    const repo = new MockRepository();
    const store = new Map<string, string>();
    repo.attachStorage({
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => {
        store.set(k, v);
      },
    });
    const p = saveProgram(repo, manual());
    expect(() => approveProgram(repo, p.id, false)).toThrow();
    const approved = approveProgram(repo, p.id, true);
    const [id] = await repo.assignProgram(p.id);
    const w = repo.getSnapshot().workouts.find((w) => w.id === id)!;
    const record = {
      id: 'registro',
      studentId: 'ana',
      workoutId: id,
      versionId: approved.approvedVersion!,
      prescription: w.cardio![0],
      date: '2026-11-12',
      seconds: 600,
      distance: 1,
      rpe: 4,
      notes: 'Fictício',
    };
    saveCardioRecord(repo, record, 'ana');
    expect(() => saveCardioRecord(repo, { ...record, studentId: 'bruno' }, 'bruno')).toThrow();
    saveProgram(repo, { ...approved, title: 'Versão seguinte' });
    const next = approveProgram(repo, p.id, true);
    await repo.assignProgram(p.id);
    expect(next.approvedVersion).not.toBe(approved.approvedVersion);
    expect(repo.getSnapshot().experience.cardioRecords?.[0].versionId).toBe(
      approved.approvedVersion,
    );
    expect(repo.getSnapshot().experience.cardioRecords?.[0].prescription.modality.name).toBe(
      'Caminhada na esteira',
    );
    const restored = new MockRepository();
    restored.attachStorage({
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => {
        store.set(k, v);
      },
    });
    expect(store.has(STORAGE_KEY)).toBe(true);
    expect(restored.getSnapshot().experience.cardioRecords?.[0].seconds).toBe(600);
    saveCardioRecord(restored, { ...record, seconds: 500 }, 'ana');
    expect(restored.getSnapshot().experience.cardioRecords).toHaveLength(1);
  });
  it('reserva tempo, respeita equipamentos e não cria intensidade por nível', () => {
    const q: Questionnaire = {
      studentId: 'ana',
      age: 30,
      experience: 'Mais de um ano',
      level: 'Avançado',
      goal: 'Condicionamento geral',
      frequency: 1,
      minutes: 40,
      days: ['Segunda'],
      location: 'Academia',
      coaching: 'Presencial',
      equipment: ['Peso corporal', 'Esteira'],
      excluded: [],
      avoidPatterns: [],
      notes: '',
      specialContext: false,
      split: 'Full body',
      cardio: {
        include: 'Sim',
        goal: 'Condicionamento',
        modalities: ['cardio-0'],
        frequency: 1,
        minutes: 10,
        experience: 'Prévia',
        notes: '',
      },
    };
    const result = generateProgram(q);
    expect(result.kind).toBe('proposal');
    if (result.kind === 'proposal') {
      expect(result.program.days[0].cardio?.[0].type).toBe('Contínuo');
      expect(result.program.days[0].exercises.length).toBeLessThanOrEqual(3);
    }
    expect(generateProgram({ ...q, cardio: { ...q.cardio!, minutes: 40 } }).kind).toBe('review');
    expect(generateProgram({ ...q, age: 16 }).kind).toBe('review');
    expect(generateProgram({ ...q, equipment: ['Peso corporal'] }).kind).toBe('review');
  });
});
