import { describe, expect, it } from 'vitest';
import { MockRepository } from '@/services/mock/repository';
import { createSeed } from '@/services/mock/seed';
import { appointmentOverlaps } from '@/domain/selectors';
import type { SetLog } from '@/domain/types';
const student = {
  name: 'Aluno de Teste',
  email: 'teste@example.com',
  goal: 'Testar o acompanhamento',
  status: 'Ativo' as const,
};
function completeDraft(repository: MockRepository, workoutId = 'treino-a') {
  const workout = repository.getSnapshot().workouts.find((w) => w.id === workoutId)!;
  const sets = workout.exercises.flatMap((e) =>
    Array.from({ length: e.sets }, (_, i) => ({
      exerciseId: e.exerciseId,
      set: i + 1,
      kg: 20,
      reps: e.reps,
      done: true,
    })),
  );
  repository.saveDraft(workoutId, sets);
  return sets;
}
describe('Consistência do repositório demonstrativo', () => {
  it('preserva a carga prescrita e rejeita carga inválida sem alterar a ficha', async () => {
    const repository = new MockRepository();
    const workout = repository.getSnapshot().workouts[0];
    const input = { ...workout, exercises: workout.exercises.map((e) => ({ ...e, kg: 12.5 })) };
    await repository.saveWorkout(input, workout.id);
    expect(repository.getSnapshot().workouts[0].exercises[0].kg).toBe(12.5);
    const valid = repository.getSnapshot();
    await expect(
      repository.saveWorkout(
        { ...input, exercises: [{ ...input.exercises[0], kg: -1 }] },
        workout.id,
      ),
    ).rejects.toThrow();
    expect(repository.getSnapshot()).toBe(valid);
    await repository.saveWorkout(
      { ...input, exercises: [{ ...input.exercises[0], kg: 0 }] },
      workout.id,
    );
    expect(repository.getSnapshot().workouts[0].exercises[0].kg).toBe(0);
  });
  it('cria alunos e rejeita e-mails duplicados sem alterar o estado', async () => {
    const r = new MockRepository();
    const id = await r.saveStudent(student);
    expect(r.getSnapshot().students.find((s) => s.id === id)?.name).toBe(student.name);
    const snapshot = r.getSnapshot();
    await expect(r.saveStudent({ ...student, email: 'TESTE@example.com' })).rejects.toThrow(
      'e-mail',
    );
    expect(r.getSnapshot()).toBe(snapshot);
  });
  it('rejeita entradas inválidas e alunos inexistentes', async () => {
    const r = new MockRepository();
    await expect(r.saveStudent({ ...student, name: ' ' })).rejects.toThrow();
    await expect(
      r.saveWorkout({
        title: 'Treino de teste',
        studentId: 'ausente',
        notes: '',
        exercises: [{ exerciseId: 'remada', sets: 2, reps: 10, rest: 60 }],
      }),
    ).rejects.toThrow('Aluno');
  });
  it('valida exercícios e duplicatas na prescrição', async () => {
    const r = new MockRepository();
    const input = {
      title: 'Novo treino',
      studentId: 'ana',
      notes: '',
      exercises: [{ exerciseId: 'ausente', sets: 2, reps: 10, rest: 60 }],
    };
    await expect(r.saveWorkout(input)).rejects.toThrow('Exercício');
    input.exercises = [
      { exerciseId: 'remada', sets: 2, reps: 10, rest: 60 },
      { exerciseId: 'remada', sets: 2, reps: 10, rest: 60 },
    ];
    await expect(r.saveWorkout(input)).rejects.toThrow();
  });
  it('identifica conflitos, mas permite intervalos adjacentes', async () => {
    const r = new MockRepository();
    const input = {
      studentId: 'ana',
      date: '2026-11-12',
      time: '09:30',
      duration: 30,
      kind: 'Online' as const,
    };
    await expect(r.saveAppointment(input)).rejects.toThrow('conflita');
    await r.saveAppointment({ ...input, time: '10:00' });
    expect(r.getSnapshot().appointments).toHaveLength(5);
  });
  it('libera horário cancelado e rejeita sessão atravessando a meia-noite', async () => {
    const r = new MockRepository();
    await r.cancelAppointment('a1');
    await r.saveAppointment({
      studentId: 'ana',
      date: '2026-11-12',
      time: '09:00',
      duration: 60,
      kind: 'Presencial',
    });
    await expect(
      r.saveAppointment({
        studentId: 'ana',
        date: '2026-11-12',
        time: '23:30',
        duration: 60,
        kind: 'Online',
      }),
    ).rejects.toThrow('mesmo dia');
  });
  it('não conclui séries incompletas, negativas ou duplicadas', async () => {
    const r = new MockRepository();
    await expect(r.finishWorkout('treino-a', 12)).rejects.toThrow('séries');
    const sets = completeDraft(r);
    r.saveDraft(
      'treino-a',
      sets.map((s, i) => (i === 0 ? { ...s, kg: -1 } : s)),
    );
    await expect(r.finishWorkout('treino-a', 12)).rejects.toThrow();
    r.saveDraft(
      'treino-a',
      sets.map((s, i) => (i === 1 ? sets[0] : s)),
    );
    await expect(r.finishWorkout('treino-a', 12)).rejects.toThrow();
  });
  it('registra a sessão uma vez e limpa o rascunho', async () => {
    const r = new MockRepository();
    completeDraft(r);
    const id = await r.finishWorkout('treino-a', 32);
    expect(r.getSnapshot().sessions.find((s) => s.id === id)?.sets).toHaveLength(8);
    expect(r.getSnapshot().drafts['treino-a']).toBeUndefined();
    await expect(r.finishWorkout('treino-a', 32)).rejects.toThrow();
  });
  it('preserva histórico ao editar a prescrição e limpa rascunho antigo', async () => {
    const r = new MockRepository();
    completeDraft(r);
    await r.finishWorkout('treino-a', 32);
    const history = structuredClone(r.getSnapshot().sessions);
    completeDraft(r);
    const w = r.getSnapshot().workouts.find((w) => w.id === 'treino-a')!;
    await r.saveWorkout(
      {
        ...w,
        title: 'Nova versão',
        exercises: [{ exerciseId: 'remada', sets: 1, reps: 8, rest: 30 }],
      },
      w.id,
    );
    expect(r.getSnapshot().sessions).toEqual(history);
    expect(r.getSnapshot().drafts[w.id]).toBeUndefined();
  });
  it('mantém o perfil do aluno e a ficha do personal sincronizados', async () => {
    const r = new MockRepository();
    await r.saveProfile('aluno', {
      name: 'Ana de Teste',
      email: 'nova@example.com',
      specialty: 'Novo objetivo',
      notifications: false,
    });
    expect(r.getSnapshot().students.find((s) => s.id === 'ana')?.name).toBe('Ana de Teste');
    await r.saveStudent(
      {
        name: 'Ana Atualizada',
        email: 'nova@example.com',
        goal: 'Objetivo atualizado',
        status: 'Ativo',
      },
      'ana',
    );
    expect(r.getSnapshot().profiles.aluno.name).toBe('Ana Atualizada');
  });
  it('rejeita avaliações duplicadas, futuras ou sem aluno', async () => {
    const r = new MockRepository();
    await expect(
      r.saveMeasurement({ studentId: 'ana', date: '2026-11-10', weight: 68, waist: 76 }),
    ).rejects.toThrow('Já existe');
    await expect(
      r.saveMeasurement({ studentId: 'ana', date: '2026-12-01', weight: 68, waist: 76 }),
    ).rejects.toThrow('futura');
    await r.saveMeasurement({ studentId: 'ana', date: '2026-11-12', weight: 68, waist: 76 });
    expect(r.getSnapshot().measurements).toHaveLength(7);
  });
  it('sincroniza organização e assinatura e rejeita plano inexistente', async () => {
    const r = new MockRepository();
    await expect(r.updateOrganization('org-1', 'ausente', 'Ativa')).rejects.toThrow();
    await r.updateOrganization('org-1', 'essencial', 'Pausada');
    expect(r.getSnapshot().organizations[0].planId).toBe('essencial');
    expect(r.getSnapshot().subscriptions[0].status).toBe('Pausada');
  });
  it('notifica assinantes e mantém instâncias independentes', async () => {
    const r = new MockRepository();
    const other = new MockRepository();
    let calls = 0;
    const unsubscribe = r.subscribe(() => calls++);
    await r.saveStudent(student);
    expect(calls).toBe(1);
    unsubscribe();
    await r.saveStudent({ ...student, email: 'outro@example.com' });
    expect(calls).toBe(1);
    expect(other.getSnapshot().students).toHaveLength(6);
  });
  it('copia os rascunhos recebidos para evitar mutações externas', () => {
    const r = new MockRepository();
    const sets: SetLog[] = [{ exerciseId: 'remada', set: 1, kg: 10, reps: 10, done: true }];
    r.saveDraft('treino-a', sets);
    sets[0].kg = 999;
    expect(r.getSnapshot().drafts['treino-a'][0].kg).toBe(10);
  });
  it('mantém todas as referências atuais das fixtures', () => {
    const state = createSeed();
    for (const w of state.workouts) {
      expect(state.students.some((s) => s.id === w.studentId)).toBe(true);
      for (const p of w.exercises)
        expect(state.exercises.some((e) => e.id === p.exerciseId)).toBe(true);
    }
    for (const a of state.appointments)
      expect(state.students.some((s) => s.id === a.studentId)).toBe(true);
    expect(
      appointmentOverlaps(
        { date: '2026-11-13', time: '09:00', duration: 30 },
        state.appointments[0],
      ),
    ).toBe(false);
  });
});
