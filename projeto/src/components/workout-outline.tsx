import { estimateDay } from '@/domain/training-plan';
import type { Workout, Exercise } from '@/domain/types';
import { cardioSeconds, parameterLabels } from '@/domain/cardio';

export function WorkoutOutline({ workout, library }: { workout: Workout; library: Exercise[] }) {
  const summary = estimateDay(workout);
  return (
    <section className="workout-outline">
      <h3>{workout.title}</h3>
      <p className="outline-meta">
        {workout.weekday ?? 'Dia livre'} · {workout.exercises.length} exercícios · {summary.sets}{' '}
        séries · cerca de {summary.minutes} min
      </p>
      {workout.notes && <p>{workout.notes}</p>}
      <ol>
        {workout.exercises.map((row, i) => {
          const exercise =
            library.find((e) => e.id === row.exerciseId) ??
            library.find((e) => e.id === row.exerciseId.split('--')[0]);
          return (
            <li key={row.rowId ?? i}>
              <strong>{exercise?.name ?? 'Exercício da ficha'}</strong>
              <span>
                {row.sets} × {row.reps}
                {row.repsMax ? '–' + row.repsMax : ''} · descanso {row.rest}s
                {row.kg !== undefined ? ' · ' + row.kg + ' kg' : ''}
                {row.rir !== undefined && ' · ' + row.rir + ' repetições em reserva'}
                {row.rpe !== undefined && ' · esforço ' + row.rpe + '/10'}
              </span>
              {row.notes && <p>{row.notes}</p>}
              {exercise?.instructions && (
                <small>
                  {exercise.instructions}
                  {!exercise.id.startsWith('own-') &&
                    ' Orientação de catálogo pendente de validação técnica.'}
                </small>
              )}
            </li>
          );
        })}
      </ol>
      {workout.cardio?.map((c) => (
        <div key={c.id}>
          <strong>Cardio · {c.modality.name}</strong>
          <p>
            {c.position} · {c.type} · {Math.ceil(cardioSeconds(c) / 60)} min · {c.intensity}
          </p>
          <p>
            {c.frequency}× por semana · {c.method}
            {c.blocks.length > 0 && ' · ' + c.cycles + ' ciclo(s)'}
          </p>
          {c.hrMin !== undefined && (
            <p>
              Faixa orientada: {c.hrMin}–{c.hrMax} bpm
            </p>
          )}
          {c.modality.parameters
            .filter((key) => c[key] !== undefined)
            .map((key) => (
              <p key={key}>
                {parameterLabels[key]}: {c[key]}
              </p>
            ))}
          {c.notes && <p>{c.notes}</p>}
          {c.blocks.map((b) => (
            <p key={b.id}>
              {b.type} · {b.repeats} × {b.seconds}s · {b.intensity}
              {b.notes && ' · ' + b.notes}
            </p>
          ))}
        </div>
      ))}
    </section>
  );
}
