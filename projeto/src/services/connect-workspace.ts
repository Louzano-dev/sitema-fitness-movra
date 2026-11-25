import { emptyExperience } from '@/domain/experience';
import { DEMO_DATE, ORGANIZATION_ID, type DemoState, type Student } from '@/domain/types';
import { connectService, type ConnectAccount } from './connect-service';
import { readLocal, writeLocal } from './local-storage';
import { MockRepository } from './mock/repository';
import { createSeed } from './mock/seed';
import { professionalService, linkAllows } from './professional-service';
import { emptyLibrary, libraryKey } from '@/domain/student-library';

type WorkspaceStorage = Pick<Storage, 'getItem' | 'setItem'>;
const memory = new Map<string, string>();
const fallback: WorkspaceStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => {
    memory.set(key, value);
  },
};
export function workspaceStorage(): WorkspaceStorage {
  try {
    return window.localStorage;
  } catch {
    return fallback;
  }
}
function accountStorage(storage: WorkspaceStorage, id: string): WorkspaceStorage {
  const key = 'movra:connect:workspace:' + id;
  return {
    getItem: () => storage.getItem(key),
    setItem: (_, value) => {
      if (storage.getItem(key) !== value) storage.setItem(key, value);
    },
  };
}
function learner(account: ConnectAccount): Student {
  return {
    id: account.id,
    organizationId: ORGANIZATION_ID,
    name: account.name,
    email: account.id + '@example.com',
    goal: 'A definir com o personal',
    status: 'Ativo',
    joinedAt: DEMO_DATE,
    color: 'sage',
  };
}
function stored(storage: WorkspaceStorage, account: ConnectAccount): DemoState {
  const saved = readLocal(accountStorage(storage, account.id));
  if (saved) return saved;
  const base = createSeed();
  return {
    ...base,
    students: account.role === 'aluno' ? [learner(account)] : [],
    workouts: [],
    sessions: [],
    measurements: [],
    appointments: [],
    organizations: [],
    subscriptions: [],
    drafts: {},
    workoutCheckpoints: {},
    profiles: {
      ...base.profiles,
      [account.role]: {
        name: account.name,
        email: account.id + '@example.com',
        specialty: account.role === 'personal' ? 'Personal trainer' : 'A definir com o personal',
        notifications: false,
      },
    },
    experience: { ...emptyExperience(), ages: {} },
  };
}

export function currentWorkspaceAppointments(account: ConnectAccount) {
  if (account.role !== 'personal' || !connectService.isActive(account.id))
    throw new Error('Entre no perfil autorizado para continuar.');
  return stored(workspaceStorage(), account).appointments;
}

function combine<T extends { id: string }>(incoming: T[], existing: T[]) {
  const ids = new Set(incoming.map((item) => item.id));
  return [...incoming, ...existing.filter((item) => !ids.has(item.id))];
}

function trainerView(state: DemoState, members: ConnectAccount[]): DemoState {
  const linked = new Set(members.map((member) => member.id));
  const visible = (id: string) => !id.startsWith('s-') || linked.has(id);
  const allowed = (item: { studentId: string }) => visible(item.studentId);
  return {
    ...state,
    students: state.students.filter((s) => visible(s.id)),
    workouts: state.workouts.filter(allowed),
    appointments: state.appointments.filter(allowed),
    measurements: state.measurements.filter(allowed),
    sessions: state.sessions.filter(allowed),
    experience: {
      ...state.experience,
      ages: Object.fromEntries(Object.entries(state.experience.ages).filter(([id]) => visible(id))),
      programs: state.experience.programs.filter(allowed),
      versions: state.experience.versions.filter(allowed),
      assignments: state.experience.assignments.filter(allowed),
      cardioRecords: state.experience.cardioRecords?.filter(allowed),
    },
  };
}

// Apply only edits made in this view. Hidden records and rows updated by another tab stay in storage.
function mergeRows<T extends { id: string }>(
  current: T[],
  previous: T[],
  next: T[],
  key = (row: T) => row.id,
) {
  const before = new Map(previous.map((row) => [key(row), row]));
  const after = new Set(next.map(key));
  const changed = next.filter((row) => {
    const old = before.get(key(row));
    return old !== row && JSON.stringify(old) !== JSON.stringify(row);
  });
  const edits = new Set(changed.map(key));
  return [
    ...changed,
    ...current.filter(
      (row) => !edits.has(key(row)) && (!before.has(key(row)) || after.has(key(row))),
    ),
  ];
}
function mergeMap<T>(
  current: Record<string, T>,
  before: Record<string, T>,
  next: Record<string, T>,
) {
  const result = { ...current };
  for (const id of Object.keys(before)) if (!(id in next)) delete result[id];
  for (const [id, value] of Object.entries(next)) {
    if (before[id] !== value && JSON.stringify(before[id]) !== JSON.stringify(value))
      result[id] = value;
  }
  return result;
}
function mergeWorkspace(current: DemoState, before: DemoState, next: DemoState): DemoState {
  const old = before.experience;
  const fresh = current.experience;
  const edit = next.experience;
  const libraries = { ...fresh.libraries };
  for (const [studentId, edited] of Object.entries(edit.libraries ?? {})) {
    const baseline = old.libraries?.[studentId] ?? emptyLibrary;
    const currentBook = libraries[studentId] ?? emptyLibrary;
    libraries[studentId] = {
      main: edited.main === baseline.main ? currentBook.main : edited.main,
      entries: mergeMap(currentBook.entries, baseline.entries, edited.entries),
    };
  }
  return {
    ...next,
    students: mergeRows(current.students, before.students, next.students),
    workouts: mergeRows(current.workouts, before.workouts, next.workouts),
    exercises: mergeRows(current.exercises, before.exercises, next.exercises),
    sessions: mergeRows(current.sessions, before.sessions, next.sessions),
    measurements: mergeRows(current.measurements, before.measurements, next.measurements),
    appointments: mergeRows(current.appointments, before.appointments, next.appointments),
    drafts: mergeMap(current.drafts, before.drafts, next.drafts),
    workoutCheckpoints: mergeMap(
      current.workoutCheckpoints ?? {},
      before.workoutCheckpoints ?? {},
      next.workoutCheckpoints ?? {},
    ),
    experience: {
      ...edit,
      ages: mergeMap(fresh.ages, old.ages, edit.ages),
      libraries,
      habits: mergeMap(fresh.habits ?? {}, old.habits ?? {}, edit.habits ?? {}),
      programs: mergeRows(fresh.programs, old.programs, edit.programs),
      versions: mergeRows(
        fresh.versions,
        old.versions,
        edit.versions,
        (v) => v.approvedVersion ?? v.id,
      ),
      assignments: mergeRows(fresh.assignments, old.assignments, edit.assignments),
      cardioRecords: mergeRows(
        fresh.cardioRecords ?? [],
        old.cardioRecords ?? [],
        edit.cardioRecords ?? [],
      ),
    },
  };
}
function deliver(
  trainer: DemoState,
  student: DemoState,
  id: string,
  author: ConnectAccount,
  linkId: string,
): DemoState {
  const copies = new Map(student.workouts.map((w) => [w.id, w]));
  const workouts = trainer.workouts
    .filter((w) => w.studentId === id)
    .map((w) => {
      const previous = copies.get(w.id);
      if (previous?.delivery && previous.versionId && previous.versionId === w.versionId)
        return previous;
      const version = trainer.experience.versions.find(
        (v) => w.versionId && v.approvedVersion === w.versionId,
      );
      const delivery = previous?.delivery ?? {
        trainerId: author.id,
        trainerName: author.name,
        linkId,
        issuedAt: Date.now(),
        title: version?.title ?? w.title,
        goal: version?.questionnaire?.goal || trainer.students.find((s) => s.id === id)?.goal || '',
        policy: 'retained-personal-use' as const,
      };
      return { ...w, delivery };
    });
  const exercises = new Set(workouts.flatMap((w) => w.exercises.map((e) => e.exerciseId)));
  const assignments = trainer.experience.assignments.filter((a) => a.studentId === id);
  const savedBook = student.experience.libraries?.[id];
  const book = savedBook && { ...savedBook, entries: { ...savedBook.entries } };
  if (book) {
    for (const workout of workouts) {
      const old = copies.get(workout.id);
      if (!old || old.delivery) continue;
      const priorKey = libraryKey(old);
      const deliveredKey = libraryKey(workout);
      if (book.entries[priorKey]) {
        book.entries[deliveredKey] = book.entries[priorKey];
        delete book.entries[priorKey];
      }
      if (book.main === priorKey) book.main = deliveredKey;
    }
  }
  return {
    ...student,
    workouts: combine(workouts, student.workouts),
    measurements: combine(
      trainer.measurements.filter((m) => m.studentId === id),
      student.measurements,
    ),
    appointments: combine(
      trainer.appointments
        .filter((a) => a.studentId === id)
        .map((a) => ({ ...a, trainerId: author.id })),
      student.appointments,
    ),
    exercises: combine(
      trainer.exercises.filter((e) => exercises.has(e.id)),
      student.exercises,
    ),
    experience: {
      ...student.experience,
      ...(book && { libraries: { ...student.experience.libraries, [id]: book } }),
      assignments: combine(assignments, student.experience.assignments),
      ages: trainer.experience.ages[id]
        ? { ...student.experience.ages, [id]: trainer.experience.ages[id] }
        : student.experience.ages,
    },
  };
}

export function openConnectWorkspace(account: ConnectAccount, storage: WorkspaceStorage) {
  if (!connectService.isActive(account.id))
    throw new Error('Entre no perfil autorizado para continuar.');
  const personal = account.role === 'personal';
  const members = personal ? connectService.linkedStudents(account.id) : [];
  const saved = stored(storage, account);
  let before = personal ? trainerView(saved, members) : saved;
  const state = { ...before };
  if (personal) {
    for (const member of members) {
      const student = stored(storage, member);
      const ongoing = linkAllows(account.id, member.id, 'training');
      const workouts = new Set(
        state.workouts.filter((w) => w.studentId === member.id).map((w) => w.id),
      );
      const ownWorkout = (row: { studentId: string; workoutId: string }) =>
        row.studentId === member.id && workouts.has(row.workoutId);
      const sessions = (ongoing ? student.sessions.filter(ownWorkout) : []).map((session) => {
        const exercises = new Set(session.sets.map((set) => set.exerciseId));
        return {
          ...session,
          exerciseNames: Object.fromEntries(
            Object.entries(session.exerciseNames).filter(([id]) => exercises.has(id)),
          ),
        };
      });
      state.students = combine(
        [student.students.find((s) => s.id === member.id) ?? learner(member)],
        state.students,
      );
      state.sessions = combine(sessions, state.sessions);
      state.experience = {
        ...state.experience,
        cardioRecords: combine(
          ongoing ? (student.experience.cardioRecords ?? []).filter(ownWorkout) : [],
          state.experience.cardioRecords ?? [],
        ),
      };
    }
  } else {
    const trainer = connectService.activeTrainer(account.id);
    state.profiles = {
      ...state.profiles,
      personal: { ...state.profiles.personal, name: trainer?.name ?? 'Sem personal vinculado' },
    };
  }

  const repo = new MockRepository(
    state,
    personal
      ? (input, id) =>
          professionalService.checkBooking(
            account.id,
            input,
            stored(storage, account).appointments,
            id,
          )
      : undefined,
    (studentId) => {
      if (
        !personal ||
        (studentId.startsWith('s-') && !linkAllows(account.id, studentId, 'training'))
      )
        throw Error('A entrega de fichas exige um acompanhamento ativo com treino incluído.');
    },
  );
  repo.attachStorage({
    getItem: () => JSON.stringify({ version: 3, state }),
    setItem: () => {
      if (!connectService.isActive(account.id)) return;
      const linked = personal ? connectService.linkedStudents(account.id) : [];
      const next = repo.getSnapshot();
      const merged = mergeWorkspace(
        stored(storage, account),
        personal ? trainerView(before, linked) : before,
        personal ? trainerView(next, linked) : next,
      );
      writeLocal(accountStorage(storage, account.id), merged);
      before = next;
      for (const member of linked) {
        const student = stored(storage, member);
        const link = connectService
          .professionalLinks(account.id)
          .find((l) => l.studentId === member.id && l.endedAt === null);
        if (link && linkAllows(account.id, member.id, 'training', link.startedAt))
          writeLocal(
            accountStorage(storage, member.id),
            deliver(merged, student, member.id, account, link.id),
          );
        else {
          const cancelled = new Set(
            merged.appointments
              .filter((a) => a.studentId === member.id && a.status === 'Cancelado')
              .map((a) => a.id),
          );
          if (
            student.appointments.some(
              (a) => a.trainerId === account.id && a.status !== 'Cancelado' && cancelled.has(a.id),
            )
          )
            writeLocal(accountStorage(storage, member.id), {
              ...student,
              appointments: student.appointments.map((a) =>
                a.trainerId === account.id && cancelled.has(a.id)
                  ? { ...a, status: 'Cancelado' }
                  : a,
              ),
            });
        }
      }
    },
  });
  return repo;
}
