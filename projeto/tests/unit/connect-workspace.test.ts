import { describe, expect, it } from 'vitest';
import { DEMO_DATE } from '@/domain/types';
import { makeCardio } from '@/domain/cardio';
import { civilDate, consistency, newRoutine, setWeekdays } from '@/domain/habits';
import { connectService, type ConnectAccount } from '@/services/connect-service';
import { openConnectWorkspace } from '@/services/connect-workspace';
import { marketplaceService } from '@/services/marketplace-service';
import { blankProfile } from '@/domain/marketplace';
import { approveProgram, saveProgram } from '@/services/experience-service';

async function fixture() {
  const data = new Map<string, string>();
  const storage = {
    getItem: (id: string) => data.get(id) ?? null,
    setItem: (id: string, raw: string) => {
      data.set(id, raw);
    },
  };
  const trainer = await connectService.createAccount('personal', 'Personal A');
  const other = await connectService.createAccount('personal', 'Personal B');
  const student = await connectService.createAccount('aluno', 'Aluna');
  const open = (account: ConnectAccount) => {
    connectService.activate(account.id);
    return openConnectWorkspace(account, storage);
  };
  async function link(account: ConnectAccount) {
    connectService.activate(account.id);
    const { token } = await connectService.issueInvite(account.id);
    connectService.activate(student.id);
    await connectService.confirm(student.id, token, account.id);
  }
  await link(trainer);
  return { open, link, trainer, other, student };
}

describe('Workspaces do MOVRA Connect', () => {
  it('preserva a rotina e a atividade independente ao encerrar e iniciar acompanhamentos', async () => {
    const { open, link, student, trainer, other } = await fixture();
    const owner = open(student);
    const today = civilDate(new Date(), 'America/Sao_Paulo');
    const routine = setWeekdays(newRoutine('America/Sao_Paulo'), [0, 1, 2, 3, 4, 5, 6], today);
    owner.updateExperience((s) => ({ ...s, habits: { [student.id]: routine } }));
    owner.recordIndependentWorkout(student.id, 'Atividade pessoal', 30, false);
    await connectService.unlink(student.id, trainer.id);
    const afterCancel = open(student).getSnapshot();
    expect(
      consistency(afterCancel.experience.habits![student.id], afterCancel.sessions, today).streak,
    ).toBe(1);
    await link(other);
    const otherWorkspace = open(other).getSnapshot();
    expect(otherWorkspace.experience.habits?.[student.id]).toBeUndefined();
    expect(otherWorkspace.sessions).toEqual([]);
    const afterSwitch = open(student).getSnapshot();
    expect(afterSwitch.experience.habits?.[student.id]).toEqual(routine);
    expect(afterSwitch.sessions).toEqual(afterCancel.sessions);
    expect(consistency(routine, afterSwitch.sessions, today).achievements).toMatchObject([
      { id: 'first-workout' },
    ]);
  });
  it('mantém fichas, avaliações e sessões na troca de personal e restaura apenas o histórico do vínculo retomado', async () => {
    const { open, link, trainer, other, student } = await fixture();
    const first = open(trainer);
    const exerciseId = first.saveOwnExercise({
      name: 'Exercício privado do personal A',
      group: 'Força',
      equipment: 'Banco',
      instructions: 'Orientação individual.',
    });
    const input = {
      studentId: student.id,
      title: 'Treino do personal A',
      notes: '',
      exercises: [{ exerciseId, sets: 1, reps: 8, rest: 60 }],
    };
    const workout = await first.saveWorkout(input);
    await first.saveMeasurement({ studentId: student.id, date: DEMO_DATE, weight: 80, waist: 85 });
    first.updateExperience((s) => ({ ...s, ages: { [student.id]: 32 } }));
    const owner = open(student);
    owner.saveDraft(workout, [{ exerciseId, set: 1, kg: 10, reps: 8, done: true }]);
    const session = await owner.finishWorkout(workout, 120, student.id, 'Feedback A');
    owner.updateExperience((s) => ({
      ...s,
      cardioRecords: [
        {
          id: 'cardio-a',
          studentId: student.id,
          workoutId: workout,
          versionId: 'a',
          prescription: makeCardio(),
          date: DEMO_DATE,
          seconds: 120,
          notes: '',
        },
      ],
    }));
    expect(
      open(trainer)
        .getSnapshot()
        .sessions.map((s) => s.id),
    ).toEqual([session]);
    await connectService.unlink(student.id, trainer.id);
    const hidden = open(trainer);
    expect(hidden.getSnapshot().workouts).toEqual([]);
    expect(hidden.getSnapshot().measurements).toEqual([]);
    expect(hidden.getSnapshot().sessions).toEqual([]);
    expect(hidden.getSnapshot().experience.ages).toEqual({});
    // An old tab cannot change an archived prescription after unlinking.
    await expect(first.saveWorkout({ ...input, title: 'Edição tardia' }, workout)).rejects.toThrow(
      'acompanhamento ativo',
    );
    await link(other);
    const second = open(other);
    expect(second.getSnapshot().students.map((s) => s.id)).toEqual([student.id]);
    expect(second.getSnapshot().workouts).toEqual([]);
    expect(second.getSnapshot().sessions).toEqual([]);
    expect(second.getSnapshot().measurements).toEqual([]);
    expect(second.getSnapshot().experience.cardioRecords).toEqual([]);
    const ownExercise = second.getSnapshot().exercises[0].id;
    const secondWorkout = await second.saveWorkout({
      ...input,
      title: 'Treino B',
      exercises: [{ exerciseId: ownExercise, sets: 1, reps: 8, rest: 60 }],
    });
    const athlete = open(student);
    expect(athlete.getSnapshot().measurements.map((m) => m.weight)).toEqual([80]);
    expect(
      athlete
        .getSnapshot()
        .workouts.map((w) => w.id)
        .sort(),
    ).toEqual([workout, secondWorkout].sort());
    athlete.saveDraft(secondWorkout, [
      { exerciseId: ownExercise, set: 1, kg: 5, reps: 8, done: true },
    ]);
    await athlete.finishWorkout(secondWorkout, 80, student.id, 'Feedback B');
    const viewB = open(other).getSnapshot();
    expect(viewB.sessions.map((s) => s.note)).toEqual(['Feedback B']);
    expect(viewB.sessions[0].exerciseNames).not.toHaveProperty(exerciseId);
    await link(trainer);
    const restored = open(trainer).getSnapshot();
    expect(restored.workouts.map((w) => w.title)).toEqual([input.title]);
    expect(restored.sessions.map((s) => s.id)).toEqual([session]);
    expect(restored.measurements).toHaveLength(1);
    expect(restored.experience.ages[student.id]).toBe(32);
    expect(restored.experience.cardioRecords?.map((r) => r.id)).toEqual(['cardio-a']);
  });

  it('mantém a atribuição e o cancelamento recentes quando outra aba registra ou edita feedback', async () => {
    const { open, trainer, student } = await fixture();
    connectService.activate(trainer.id);
    await marketplaceService.saveProfile(trainer.id, {
      ...blankProfile(trainer.name),
      specialties: 'Força',
      published: true,
    });
    await marketplaceService.saveOffer(trainer.id, {
      name: 'Sessões online',
      description: 'Sessões individuais',
      modality: 'Online',
      price: 10000,
      mode: 'Com agendamento',
      chat: true,
      updates: 'Mensal',
      cancellation: 'A pedido.',
    });
    const offer = marketplaceService.business(trainer.id).offers[0];
    connectService.activate(student.id);
    await marketplaceService.activateOffer(student.id, offer.id, true);
    const coach = open(trainer);
    const exerciseId = coach.getSnapshot().exercises[0].id;
    const appointment = {
      studentId: student.id,
      date: DEMO_DATE,
      time: '10:00',
      duration: 30,
      kind: 'Online' as const,
    };
    await coach.saveAppointment(appointment);
    const workout = await coach.saveWorkout({
      studentId: student.id,
      title: 'Treino atual',
      notes: '',
      exercises: [{ exerciseId, sets: 1, reps: 8, rest: 60 }],
    });
    const studentTab = open(student);
    const trainerTab = open(trainer);
    const program = saveProgram(trainerTab, {
      id: 'nova-ficha',
      studentId: student.id,
      title: 'Nova ficha',
      ruleVersion: '1',
      status: 'Rascunho',
      revision: 1,
      rationale: [],
      updatedAt: DEMO_DATE,
      supervised: true,
      template: false,
      days: [
        {
          id: 'd',
          name: 'Treino atribuído',
          weekday: 'Segunda',
          instructions: '',
          exercises: [
            { id: 'r', exerciseId, sets: 1, reps: 8, rest: 60, notes: '', locked: false },
          ],
        },
      ],
    });
    approveProgram(trainerTab, program.id, true);
    const assigned = await trainerTab.assignProgram(program.id);
    await trainerTab.cancelAppointment(trainerTab.getSnapshot().appointments[0].id);
    connectService.activate(student.id);
    studentTab.saveDraft(workout, [{ exerciseId, set: 1, kg: 5, reps: 8, done: true }]);
    const session = await studentTab.finishWorkout(workout, 80, student.id);
    const freshStudent = open(student);
    freshStudent.saveSessionNote(session, 'Comentário atualizado', student.id);
    studentTab.saveDraft(workout, []);
    const merged = open(student).getSnapshot();
    expect(merged.workouts.map((w) => w.id)).toContain(assigned[0]);
    expect(merged.experience.assignments.map((a) => a.workoutIds)).toEqual([assigned]);
    expect(merged.appointments[0].status).toBe('Cancelado');
    expect(merged.sessions.map((s) => s.note)).toEqual(['Comentário atualizado']);
    expect(
      open(trainer)
        .getSnapshot()
        .sessions.map((s) => s.note),
    ).toEqual(['Comentário atualizado']);
    connectService.activate(student.id);
    const contract = marketplaceService.contracts(student.id)[0];
    await marketplaceService.cancel(student.id, contract.id);
    expect(connectService.activeTrainer(student.id)?.id).toBe(trainer.id);
    const retained = open(student);
    expect(retained.getSnapshot().sessions.map((s) => s.id)).toContain(session);
    const independent = await retained.finishWorkout(assigned[0], 20, student.id, '', 'manual');
    const ended = open(trainer);
    expect(ended.getSnapshot().sessions.map((s) => s.id)).not.toContain(independent);
    await expect(
      ended.saveWorkout({
        studentId: student.id,
        title: 'Nova entrega após o cancelamento',
        notes: '',
        exercises: [{ exerciseId, sets: 1, reps: 8, rest: 60 }],
      }),
    ).rejects.toThrow('acompanhamento ativo');
  });
});
