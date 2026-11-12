import type {
  AppointmentInput,
  MeasurementInput,
  StudentInput,
  WorkoutInput,
} from '@/domain/schemas';
import type { DemoState, Environment, Plan, Profile, SetLog } from '@/domain/types';
export interface MovraRepository {
  reset(): void;
  getSnapshot(): DemoState;
  subscribe(listener: () => void): () => void;
  saveStudent(input: StudentInput, id?: string): Promise<string>;
  saveWorkout(input: WorkoutInput, id?: string): Promise<string>;
  saveAppointment(input: AppointmentInput): Promise<void>;
  cancelAppointment(id: string): Promise<void>;
  saveMeasurement(input: MeasurementInput): Promise<void>;
  saveProfile(role: Environment, input: Profile): Promise<void>;
  savePlan(id: string, input: Omit<Plan, 'id'>): Promise<void>;
  updateOrganization(id: string, planId: string, status: 'Ativa' | 'Pausada'): Promise<void>;
  saveDraft(workoutId: string, sets: SetLog[]): void;
  finishWorkout(workoutId: string, duration: number): Promise<string>;
}
