export type Environment = 'personal' | 'aluno' | 'admin';
export type StudentStatus = 'Ativo' | 'Pausado';
export interface Student {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  goal: string;
  status: StudentStatus;
  joinedAt: string;
  color: string;
}
export interface Exercise {
  pattern?: string;
  difficulty?: string;
  id: string;
  name: string;
  group: string;
  equipment: string;
  instructions: string;
}
export interface Prescription {
  rir?: number;
  rpe?: number;
  repsMax?: number;
  notes?: string;
  rowId?: string;
  kg?: number;
  exerciseId: string;
  sets: number;
  reps: number;
  rest: number;
}
export interface Workout {
  delivery?: import('zod').infer<typeof import('./student-library').deliverySchema>;
  cardio?: import('./cardio').Cardio[];
  programId?: string;
  versionId?: string;
  weekday?: string;
  id: string;
  organizationId: string;
  studentId: string;
  title: string;
  notes: string;
  exercises: Prescription[];
  updatedAt: string;
}
export interface SetLog {
  exerciseId: string;
  set: number;
  kg: number;
  reps: number;
  done: boolean;
}
export interface WorkoutSession {
  completedAt?: string;
  source?: 'series' | 'manual';
  extra?: boolean;
  programId?: string;
  versionId?: string;
  note?: string;
  id: string;
  studentId: string;
  workoutId: string;
  title: string;
  date: string;
  duration: number;
  sets: SetLog[];
  exerciseNames: Record<string, string>;
}
export interface Measurement {
  id: string;
  studentId: string;
  date: string;
  weight: number;
  waist: number;
}
export interface Appointment {
  trainerId?: string;
  confirmed?: boolean;
  previous?: { date: string; time: string }[];
  id: string;
  studentId: string;
  date: string;
  time: string;
  duration: number;
  kind: 'Presencial' | 'Online';
  status: 'Agendado' | 'Cancelado';
}
export interface Plan {
  id: string;
  name: string;
  limit: number;
  description: string;
}
export interface Organization {
  id: string;
  name: string;
  owner: string;
  planId: string;
  status: 'Ativa' | 'Pausada';
  since: string;
}
export interface Subscription {
  id: string;
  organizationId: string;
  status: 'Ativa' | 'Pausada';
  renewal: string;
}
export interface Profile {
  name: string;
  email: string;
  specialty: string;
  notifications: boolean;
}
export interface WorkoutCheckpoint {
  elapsedMs: number;
  previousCardioIds: string[];
}
export interface DemoState {
  experience: import('./experience').ExperienceState;
  storageState?: 'memory' | 'local' | 'unavailable' | 'invalid';
  students: Student[];
  exercises: Exercise[];
  workouts: Workout[];
  sessions: WorkoutSession[];
  measurements: Measurement[];
  appointments: Appointment[];
  plans: Plan[];
  organizations: Organization[];
  subscriptions: Subscription[];
  profiles: Record<Environment, Profile>;
  workoutCheckpoints?: Record<string, WorkoutCheckpoint>;
  drafts: Record<string, SetLog[]>;
}
export const DEMO_DATE = '2026-11-12';
export const ORGANIZATION_ID = 'org-1';
export const STUDENT_ID = 'ana';
