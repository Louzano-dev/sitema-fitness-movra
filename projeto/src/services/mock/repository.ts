import {
  appointmentSchema,
  measurementSchema,
  planSchema,
  profileSchema,
  studentSchema,
  workoutSchema,
} from '@/domain/schemas';
import type {
  AppointmentInput,
  MeasurementInput,
  StudentInput,
  WorkoutInput,
} from '@/domain/schemas';
import { appointmentOverlaps, minutes } from '@/domain/selectors';
import {
  DEMO_DATE,
  ORGANIZATION_ID,
  STUDENT_ID,
  type DemoState,
  type Environment,
  type Plan,
  type Profile,
  type SetLog,
} from '@/domain/types';
import type { MovraRepository } from '../repository';
import { createSeed } from './seed';
import { experienceSchema, type ExperienceState } from '@/domain/experience';
import { readLocal, writeLocal } from '../local-storage';
import { EXERCISES } from '@/domain/exercise-catalog';

// Adaptador de demonstração. Estas verificações garantem consistência local, não autorização.
export class MockRepository implements MovraRepository {
  private state: DemoState;
  private listeners = new Set<() => void>();
  private storage?: Pick<Storage, 'getItem' | 'setItem'>;
  constructor(seed: DemoState = createSeed()) {
    this.state = structuredClone(seed);
  }
  getSnapshot = () => this.state;
  saveSessionNote(sessionId: string, note: string, studentId: string) {
    if (
      note.length > 500 ||
      !this.state.sessions.some((s) => s.id === sessionId && s.studentId === studentId)
    )
      throw new Error('Registro de feedback inválido.');
    this.commit({
      sessions: this.state.sessions.map((s) => (s.id === sessionId ? { ...s, note } : s)),
    });
  }
  attachStorage(storage?: Pick<Storage, 'getItem' | 'setItem'>) {
    if (!storage) {
      this.storage = undefined;
      this.state = { ...this.state, storageState: 'unavailable' };
      this.listeners.forEach((listener) => listener());
      return;
    }
    this.storage = storage;
    try {
      const restored = readLocal(storage);
      this.state = restored ?? this.state;
      const existingIds = new Set(this.state.exercises.map((e) => e.id));
      this.state = {
        ...this.state,
        exercises: [...this.state.exercises, ...EXERCISES.filter((e) => !existingIds.has(e.id))],
      };
      this.commit({ storageState: 'local' });
    } catch {
      this.state = { ...this.state, storageState: 'invalid' };
      this.listeners.forEach((listener) => listener());
    }
  }
  updateExperience(update: (state: ExperienceState) => ExperienceState) {
    this.commit({
      experience: experienceSchema.parse(update(structuredClone(this.state.experience))),
    });
  }
  async assignProgram(programId: string) {
    const program = this.state.experience.programs.find((p) => p.id === programId);
    if (!program || program.status !== 'Aprovado' || !program.approvedVersion)
      throw new Error('Revise e aprove a versão antes de atribuir.');
    this.student(program.studentId);
    const snapshot = this.state.experience.versions.find(
      (p) => p.approvedVersion === program.approvedVersion,
    );
    if (!snapshot || JSON.stringify(snapshot.days) !== JSON.stringify(program.days))
      throw new Error('A ficha mudou após aprovação. Revise novamente.');
    const exercises = [...this.state.exercises];
    const workouts = program.days.map((day) => ({
      id: this.id(),
      organizationId: ORGANIZATION_ID,
      studentId: program.studentId,
      title: `${program.title} · ${day.name}`,
      notes: day.instructions,
      updatedAt: DEMO_DATE,
      programId: program.id,
      versionId: program.approvedVersion,
      weekday: day.weekday,
      cardio: structuredClone(day.cardio ?? []),
      exercises: day.exercises.map((row) => {
        const original = exercises.find((e) => e.id === row.exerciseId);
        if (!original) throw new Error('Exercício não encontrado.');
        const alias = `${original.id}--${program.approvedVersion}--${row.id}`;
        exercises.push({ ...original, id: alias });
        return {
          exerciseId: alias,
          sets: row.sets,
          reps: row.reps,
          repsMax: row.repsMax,
          rest: row.rest,
          kg: row.kg,
          notes: row.notes,
          rowId: row.id,
        };
      }),
    }));
    this.commit({
      exercises,
      workouts: [...workouts, ...this.state.workouts],
      experience: {
        ...this.state.experience,
        recentExercises: [
          ...new Set([
            ...program.days.flatMap((day) => day.exercises.map((row) => row.exerciseId)),
            ...this.state.experience.recentExercises,
          ]),
        ].slice(0, 20),
        programs: this.state.experience.programs.map((p) =>
          p.id === programId ? { ...p, status: 'Atribuído' } : p,
        ),
        assignments: [
          ...this.state.experience.assignments,
          {
            id: this.id(),
            programId,
            versionId: program.approvedVersion,
            studentId: program.studentId,
            workoutIds: workouts.map((w) => w.id),
            date: DEMO_DATE,
          },
        ],
      },
    });
    return workouts.map((w) => w.id);
  }
  reset = () => {
    this.commit(createSeed());
  };
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private commit(patch: Partial<DemoState>) {
    this.state = { ...this.state, ...patch };
    if (this.storage)
      try {
        writeLocal(this.storage, this.state);
        this.state = { ...this.state, storageState: 'local' };
      } catch {
        this.state = { ...this.state, storageState: 'unavailable' };
      }
    this.listeners.forEach((listener) => listener());
  }
  private id() {
    return crypto.randomUUID();
  }
  private student(id: string) {
    const s = this.state.students.find((s) => s.id === id && s.organizationId === ORGANIZATION_ID);
    if (!s) throw new Error('Aluno não encontrado neste espaço demonstrativo.');
    return s;
  }
  async saveStudent(input: StudentInput, id?: string) {
    const parsed = studentSchema.parse(input);
    if (this.state.students.some((s) => s.id !== id && s.email.toLowerCase() === parsed.email))
      throw new Error('Já existe um aluno com este e-mail.');
    const current = id ? this.student(id) : undefined;
    const student = {
      ...parsed,
      id: current?.id ?? this.id(),
      organizationId: ORGANIZATION_ID,
      joinedAt: current?.joinedAt ?? DEMO_DATE,
      color: current?.color ?? 'sage',
    };
    this.commit({
      students: current
        ? this.state.students.map((s) => (s.id === id ? student : s))
        : [...this.state.students, student],
      ...(id === STUDENT_ID
        ? {
            profiles: {
              ...this.state.profiles,
              aluno: {
                ...this.state.profiles.aluno,
                name: parsed.name,
                email: parsed.email,
                specialty: parsed.goal,
              },
            },
          }
        : {}),
    });
    return student.id;
  }
  async saveWorkout(input: WorkoutInput, id?: string) {
    const parsed = workoutSchema.parse(input);
    this.student(parsed.studentId);
    if (parsed.exercises.some((p) => !this.state.exercises.some((e) => e.id === p.exerciseId)))
      throw new Error('Exercício não encontrado.');
    if (id && !this.state.workouts.some((w) => w.id === id && w.organizationId === ORGANIZATION_ID))
      throw new Error('Treino não encontrado.');
    const workout = {
      ...parsed,
      id: id ?? this.id(),
      organizationId: ORGANIZATION_ID,
      updatedAt: DEMO_DATE,
    };
    const drafts = { ...this.state.drafts };
    delete drafts[workout.id];
    this.commit({
      workouts: id
        ? this.state.workouts.map((w) => (w.id === id ? workout : w))
        : [...this.state.workouts, workout],
      drafts,
    });
    return workout.id;
  }
  async saveAppointment(input: AppointmentInput) {
    const parsed = appointmentSchema.parse(input);
    this.student(parsed.studentId);
    if (minutes(parsed.time) + parsed.duration > 1440)
      throw new Error('O encontro deve terminar no mesmo dia.');
    if (this.state.appointments.some((a) => appointmentOverlaps(parsed, a)))
      throw new Error('Este horário conflita com outro agendamento. Escolha outro horário.');
    if (parsed.date < DEMO_DATE) throw new Error('Escolha uma data a partir do dia demonstrativo.');
    this.commit({
      appointments: [...this.state.appointments, { ...parsed, id: this.id(), status: 'Agendado' }],
    });
  }
  async cancelAppointment(id: string) {
    if (!this.state.appointments.some((a) => a.id === id))
      throw new Error('Agendamento não encontrado.');
    this.commit({
      appointments: this.state.appointments.map((a) =>
        a.id === id ? { ...a, status: 'Cancelado' } : a,
      ),
    });
  }
  async saveMeasurement(input: MeasurementInput) {
    const parsed = measurementSchema.parse(input);
    this.student(parsed.studentId);
    if (parsed.date > DEMO_DATE)
      throw new Error('A avaliação não pode ter data futura ao dia demonstrativo.');
    if (
      this.state.measurements.some(
        (m) => m.studentId === parsed.studentId && m.date === parsed.date,
      )
    )
      throw new Error('Já existe uma avaliação nesta data.');
    this.commit({ measurements: [...this.state.measurements, { ...parsed, id: this.id() }] });
  }
  async saveProfile(role: Environment, input: Profile, studentId = STUDENT_ID) {
    const profile = profileSchema.parse(input);
    if (role === 'aluno') {
      if (
        this.state.students.some(
          (s) => s.id !== studentId && s.email.toLowerCase() === profile.email.toLowerCase(),
        )
      )
        throw new Error('Este e-mail já está em uso na demonstração.');
      this.commit({
        profiles: { ...this.state.profiles, [role]: profile },
        students: this.state.students.map((s) =>
          s.id === studentId
            ? { ...s, name: profile.name, email: profile.email, goal: profile.specialty }
            : s,
        ),
      });
    } else
      this.commit({
        profiles: { ...this.state.profiles, [role]: profile },
        ...(role === 'personal'
          ? {
              organizations: this.state.organizations.map((organization) =>
                organization.id === ORGANIZATION_ID
                  ? { ...organization, owner: profile.name }
                  : organization,
              ),
            }
          : {}),
      });
  }
  async savePlan(id: string, input: Omit<Plan, 'id'>) {
    const parsed = planSchema.parse(input);
    if (!this.state.plans.some((p) => p.id === id)) throw new Error('Plano não encontrado.');
    this.commit({ plans: this.state.plans.map((p) => (p.id === id ? { ...parsed, id } : p)) });
  }
  async updateOrganization(id: string, planId: string, status: 'Ativa' | 'Pausada') {
    if (
      !this.state.organizations.some((o) => o.id === id) ||
      !this.state.plans.some((p) => p.id === planId) ||
      !['Ativa', 'Pausada'].includes(status)
    )
      throw new Error('Organização, plano ou situação inválida.');
    this.commit({
      organizations: this.state.organizations.map((o) =>
        o.id === id ? { ...o, planId, status } : o,
      ),
      subscriptions: this.state.subscriptions.map((s) =>
        s.organizationId === id ? { ...s, status } : s,
      ),
    });
  }
  saveDraft(workoutId: string, sets: SetLog[]) {
    this.commit({ drafts: { ...this.state.drafts, [workoutId]: structuredClone(sets) } });
  }
  async finishWorkout(workoutId: string, duration: number, studentId = STUDENT_ID, note = '') {
    const workout = this.state.workouts.find(
      (w) => w.id === workoutId && w.studentId === studentId,
    );
    if (!workout) throw new Error('Treino não disponível para o aluno demonstrativo.');
    const sets = this.state.drafts[workoutId] ?? [];
    const expected = workout.exercises.flatMap((p) =>
      Array.from({ length: p.sets }, (_, i) => `${p.exerciseId}:${i + 1}`),
    );
    if (
      sets.length !== expected.length ||
      new Set(sets.map((s) => `${s.exerciseId}:${s.set}`)).size !== expected.length ||
      sets.some(
        (s) =>
          !expected.includes(`${s.exerciseId}:${s.set}`) ||
          !s.done ||
          !Number.isFinite(s.kg) ||
          s.kg < 0 ||
          !Number.isInteger(s.reps) ||
          s.reps < 1,
      )
    )
      throw new Error('Registre carga, repetições e conclusão de todas as séries.');
    if (!Number.isFinite(duration) || duration < 0) throw new Error('Duração inválida.');
    const id = this.id();
    const session = {
      id,
      studentId,
      versionId: workout.versionId,
      note: note.slice(0, 500),
      workoutId,
      title: workout.title,
      date: DEMO_DATE,
      duration: Math.max(1, Math.round(duration)),
      sets: structuredClone(sets),
      exerciseNames: Object.fromEntries(this.state.exercises.map((e) => [e.id, e.name])),
    };
    const drafts = { ...this.state.drafts };
    delete drafts[workoutId];
    this.commit({ sessions: [session, ...this.state.sessions], drafts });
    return id;
  }
}
