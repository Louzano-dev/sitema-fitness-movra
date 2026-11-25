import { describe, expect, it } from 'vitest';
import {
  changeLibrary,
  emptyLibrary,
  featuredWorkouts,
  libraryGroups,
  libraryKey,
} from '@/domain/student-library';
import { connectService as connect, type ConnectAccount } from '@/services/connect-service';
import { openConnectWorkspace } from '@/services/connect-workspace';
import { activitiesFor, addDays, consistency, newRoutine, setWeekdays } from '@/domain/habits';

describe('Biblioteca pessoal entre vínculos', () => {
  it('preserva versões, autoria, execuções e preferências após contratar outro profissional', async () => {
    const records = new Map<string, string>();
    const storage = {
      getItem: (k: string) => records.get(k) ?? null,
      setItem: (k: string, v: string) => {
        records.set(k, v);
      },
    };
    const a = await connect.createAccount('personal', 'Treinador A'),
      b = await connect.createAccount('personal', 'Treinador B');
    const student = await connect.createAccount('aluno', 'Pessoa Teste');
    const open = (who: ConnectAccount) => {
      connect.activate(who.id);
      return openConnectWorkspace(who, storage);
    };
    async function invite(trainer: ConnectAccount) {
      connect.activate(trainer.id);
      const { token } = await connect.issueInvite(trainer.id);
      connect.activate(student.id);
      await connect.confirm(student.id, token, trainer.id, 'add');
    }
    const prescription = {
      studentId: student.id,
      title: 'Programa A',
      notes: 'Pausa confortável',
      exercises: [{ exerciseId: 'remada', sets: 1, reps: 8, rest: 60 }],
    };
    await invite(a);
    const trainerA = open(a);
    const original = await trainerA.saveWorkout(prescription);
    const next = await trainerA.saveWorkout(
      { ...prescription, title: 'Programa A revisado' },
      original,
    );
    expect(next).not.toBe(original);
    const athlete = open(student);
    const old = athlete.getSnapshot().workouts.find((w) => w.id === original)!;
    expect(old.delivery).toMatchObject({
      trainerId: a.id,
      policy: 'retained-personal-use',
      linkId: connect.professionalLinks(student.id)[0].id,
    });
    const execution = await athlete.finishWorkout(original, 120, student.id, 'Teste', 'manual');
    const completedOn = athlete.getSnapshot().sessions.find(s => s.id === execution)!.date;
    const weekday = (new Date(completedOn + 'T12:00:00Z').getUTCDay() + 6) % 7;
    const routine = setWeekdays(newRoutine('UTC'), [weekday], completedOn);
    athlete.updateExperience(state => ({...state, habits:{[student.id]:routine}}));
    const monday = addDays(completedOn, 7 - weekday);
    const earned = consistency(routine, activitiesFor(athlete.getSnapshot(), student.id), monday);
    expect(earned).toMatchObject({stage:1,goalWeeks:1});
    expect(athlete.getSnapshot().sessions.find((s) => s.id === execution)?.versionId).toBe(
      old.versionId,
    );
    await invite(b);
    expect(connect.activeTrainers(student.id)).toHaveLength(2);
    const trainerB = open(b);
    expect(trainerB.getSnapshot().sessions).toHaveLength(0);
    expect(trainerB.getSnapshot().workouts).toHaveLength(0);
    await expect(trainerB.saveWorkout(prescription, original)).rejects.toThrow(
      'Treino não encontrado',
    );
    const second = await trainerB.saveWorkout({ ...prescription, title: 'Programa B' });
    open(student);
    await connect.unlink(student.id, a.id);
    expect(connect.activeTrainers(student.id).map((t) => t.id)).toEqual([b.id]);
    const repo = open(student),
      workouts = repo.getSnapshot().workouts;
    const kept = repo.getSnapshot();
    expect(consistency(kept.experience.habits![student.id], activitiesFor(kept, student.id), monday)).toEqual(earned);
    expect(workouts.map((w) => w.id).sort()).toEqual([original, next, second].sort());
    const key = libraryKey(old);
    let library = changeLibrary(emptyLibrary, key, 'save');
    library = changeLibrary(library, key, 'main');
    expect(featuredWorkouts(workouts, student.id, library).map((w) => w.id)).toEqual([original]);
    library = changeLibrary(library, key, 'archive');
    expect(featuredWorkouts(workouts, student.id, library).map((w) => w.id)).not.toContain(
      original,
    );
    library = changeLibrary(library, key, 'restore');
    expect(featuredWorkouts(workouts, student.id, library).map((w) => w.id)).toContain(original);
    library = changeLibrary(library, key, 'remove');
    const otherTab = open(student);
    repo.updateExperience((s) => ({ ...s, libraries: { [student.id]: library } }));
    const otherKey = libraryKey(workouts.find(w => w.id === second)!);
    otherTab.updateExperience(s => ({...s, libraries:{[student.id]:changeLibrary(
      s.libraries?.[student.id] ?? emptyLibrary,otherKey,'main'
    )}}));
    const reloaded = open(student).getSnapshot();
    expect(reloaded.experience.libraries?.[student.id].main).toBe(otherKey);
    expect(
      libraryGroups(reloaded.workouts, student.id, reloaded.experience.libraries![student.id])
        .filter((g) => g.status !== 'removed')
        .flatMap((g) => g.days.map((d) => d.id))
        .sort(),
    ).toEqual([next, second].sort());
    expect(reloaded.sessions.map((s) => s.id)).toContain(execution);
    expect(open(b).getSnapshot().experience.libraries?.[student.id]).toBeUndefined();
  });
});
