import { CARDIO_CATALOG, type CardioRecord } from './cardio';
import { activitiesFor, consistency } from './habits';
import type { DemoState, WorkoutSession } from './types';

export type ShareSource =
  { kind: 'workout'; session: WorkoutSession } | { kind: 'cardio'; record: CardioRecord };

export type ShareMetric = {
  id: 'duration' | 'exercises' | 'sets' | 'distance' | 'pace';
  label: string;
  value: string;
};

export type WorkoutShare = {
  modality: string;
  title?: string;
  metrics: ShareMetric[];
  habits?: Pick<ReturnType<typeof consistency>, 'streak' | 'weekly' | 'target' | 'days'>;
};

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const remainder = seconds % 60;
  return [hours && `${hours} h`, minutes && `${minutes} min`, remainder && `${remainder} s`]
    .filter(Boolean)
    .join(' ');
}

function usableTitle(value: string, modality: string) {
  const title = value.trim().replace(/\s+/gu, ' ');
  return title && title !== modality ? title : undefined;
}

function strengthMetrics(session: WorkoutSession): ShareMetric[] {
  const metrics: ShareMetric[] = [];
  if (Number.isFinite(session.duration) && session.duration >= 0) {
    const seconds = Math.round(session.duration * 60);
    metrics.push({ id: 'duration', label: 'Duração', value: formatDuration(seconds) || '<1 min' });
  }
  const logged = session.sets.filter((set) => set.done);
  if (logged.length) {
    const exercises = new Set(logged.map((set) => set.exerciseId));
    const sets = new Set(logged.map((set) => `${set.exerciseId}:${set.set}`));
    metrics.push(
      { id: 'exercises', label: 'Exercícios', value: String(exercises.size) },
      { id: 'sets', label: 'Séries', value: String(sets.size) },
    );
  }
  return metrics;
}

function cardioMetrics(record: CardioRecord): ShareMetric[] {
  const metrics: ShareMetric[] = [];
  if (Number.isFinite(record.seconds) && record.seconds > 0) {
    const seconds = Math.round(record.seconds);
    metrics.push({ id: 'duration', label: 'Duração', value: formatDuration(seconds) || '<1 s' });
  }
  if (record.distance !== undefined && Number.isFinite(record.distance) && record.distance > 0) {
    metrics.push({
      id: 'distance',
      label: 'Distância',
      value: `${decimal.format(record.distance)} km`,
    });
    const pace = Math.round(record.seconds / record.distance);
    if (Number.isFinite(pace) && pace > 0) {
      const time = `${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, '0')}`;
      metrics.push({ id: 'pace', label: 'Ritmo', value: `${time} /km` });
    }
  }
  return metrics;
}

export function workoutShare(
  data: DemoState,
  studentId: string,
  source: ShareSource,
): WorkoutShare | undefined {
  const persisted =
    source.kind === 'workout'
      ? data.sessions.find(
          (session) => session.id === source.session.id && session.studentId === studentId,
        )
      : (data.experience.cardioRecords ?? []).find(
          (record) => record.id === source.record.id && record.studentId === studentId,
        );
  if (!persisted) return undefined;

  let modality: string;
  let title: string | undefined;
  let metrics: ShareMetric[];
  if ('prescription' in persisted) {
    modality =
      CARDIO_CATALOG.find((item) => item.id === persisted.prescription.modality.id)?.name ??
      'Cardio';
    title = usableTitle(persisted.prescription.modality.name, modality);
    metrics = cardioMetrics(persisted);
  } else {
    modality = persisted.workoutId === 'independente' ? 'Atividade física' : 'Musculação';
    title = usableTitle(persisted.title, modality);
    metrics = strengthMetrics(persisted);
  }

  const routine = data.experience.habits?.[studentId];
  if (!routine?.visible || !routine.plans.length) return { modality, title, metrics };
  const { streak, weekly, target, days } = consistency(
    routine,
    activitiesFor(data, studentId),
    persisted.date,
  );
  return {
    modality,
    title,
    metrics,
    habits: target || streak ? { streak, weekly, target, days } : undefined,
  };
}
