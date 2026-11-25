import type {
  AppointmentInput,
  MeasurementInput,
  StudentInput,
  WorkoutInput,
} from '@/domain/schemas';
import type {
  DemoState,
  Environment,
  Plan,
  Profile,
  SetLog,
  WorkoutCheckpoint,
} from '@/domain/types';
export interface MovraRepository {
  saveOwnExercise(input: Omit<import('@/domain/types').Exercise, 'id'>): string;
  attachStorage(storage?: Pick<Storage, 'getItem' | 'setItem'>): void;
  updateExperience(
    update: (
      state: import('@/domain/experience').ExperienceState,
    ) => import('@/domain/experience').ExperienceState,
  ): void;
  assignProgram(programId: string): Promise<string[]>;
  saveSessionNote(sessionId: string, note: string, studentId: string): void;
  reset(): void;
  getSnapshot(): DemoState;
  subscribe(listener: () => void): () => void;
  saveStudent(input: StudentInput, id?: string): Promise<string>;
  saveWorkout(input: WorkoutInput, id?: string): Promise<string>;
  saveAppointment(input: AppointmentInput, id?: string): Promise<void>;
  confirmAppointment(id: string): Promise<void>;
  cancelAppointment(id: string): Promise<void>;
  saveMeasurement(input: MeasurementInput): Promise<void>;
  saveProfile(role: Environment, input: Profile, studentId?: string): Promise<void>;
  savePlan(id: string, input: Omit<Plan, 'id'>): Promise<void>;
  updateOrganization(id: string, planId: string, status: 'Ativa' | 'Pausada'): Promise<void>;
  saveWorkoutCheckpoint(workoutId: string, checkpoint: WorkoutCheckpoint): void;
  saveDraft(workoutId: string, sets: SetLog[]): void;
  finishWorkout(
    workoutId: string,
    duration: number,
    studentId?: string,
    note?: string,
    confirmation?: 'recorded' | 'manual',
  ): Promise<string>;
  recordIndependentWorkout(studentId: string, title: string, minutes: number, extra: boolean): string;
}
