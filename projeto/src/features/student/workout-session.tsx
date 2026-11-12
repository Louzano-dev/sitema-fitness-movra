'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ArrowLeft, CircleCheck, Pause, Play, SkipForward } from 'lucide-react';
import { useDemo, useRepository } from '@/components/providers';
import { EmptyState, Feedback, Field, PageHeader, Panel } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { errorMessage } from '@/domain/schemas';
import type { SetLog } from '@/domain/types';
import { STUDENT_ID } from '@/domain/types';
import { formatDate } from '@/domain/selectors';
gsap.registerPlugin(useGSAP);
function SessionProgress({ value, max }: { value: number; max: number }) {
  const scope = useRef<HTMLDivElement>(null);
  const previous = useRef(0);
  const fraction = max ? value / max : 0;
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '.progress-fill',
          { scaleX: previous.current },
          { scaleX: fraction, duration: 0.24, ease: 'power2.out' },
        );
      });
      media.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('.progress-fill', { scaleX: fraction });
      });
      previous.current = fraction;
      return () => media.revert();
    },
    { scope, dependencies: [fraction], revertOnUpdate: true },
  );
  return (
    <div ref={scope}>
      <div className="flex items-center justify-between text-xs">
        <span>Séries concluídas</span>
        <strong>
          {value} / {max}
        </strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Séries concluídas"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div className="progress-fill" />
      </div>
    </div>
  );
}
function RestTimer({
  duration = 60,
  autoStart = false,
}: {
  duration?: number;
  autoStart?: boolean;
}) {
  const [seconds, setSeconds] = useState(duration);
  const [running, setRunning] = useState(autoStart);
  const deadline = useRef(0);
  useEffect(() => {
    if (!running) return;
    if (!deadline.current) deadline.current = Date.now() + duration * 1000;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setSeconds(remaining);
      if (!remaining) setRunning(false);
    }, 250);
    return () => clearInterval(interval);
  }, [running, duration]);
  return (
    <div className="timer">
      <p>Descanso opcional</p>
      <strong role="timer" aria-live="off">
        {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
      </strong>
      <div className="timer-actions">
        <Button
          variant="outline"
          size="sm"
          type="button"
          aria-label={running ? 'Pausar descanso' : `Iniciar descanso de ${duration} segundos`}
          onClick={() => {
            if (running) setRunning(false);
            else {
              const next = seconds || duration;
              setSeconds(next);
              deadline.current = Date.now() + next * 1000;
              setRunning(true);
            }
          }}
        >
          {running ? <Pause size={14} /> : <Play size={14} />} {running ? 'Pausar' : 'Iniciar'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => {
            setRunning(false);
            setSeconds(0);
          }}
        >
          <SkipForward size={14} />
          Pular
        </Button>
      </div>
      <p className="mt-3" role="status">
        {!seconds ? 'Descanso encerrado. Continue no seu ritmo.' : 'Você decide quando continuar.'}
      </p>
    </div>
  );
}
export function WorkoutSessionPage({ id }: { id: string }) {
  const data = useDemo();
  const repository = useRepository();
  const workout = data.workouts.find((w) => w.id === id && w.studentId === STUDENT_ID);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string>();
  const [rest, setRest] = useState({ duration: 60, version: 0 });
  const start = useRef<number | null>(null);
  useEffect(() => {
    start.current = Date.now();
  }, []);
  if (!workout)
    return (
      <EmptyState
        title="Treino não disponível."
        description="Este treino não está atribuído ao aluno da demonstração."
        action={
          <Button asChild>
            <Link href="/aluno/treinos">Ver meus treinos</Link>
          </Button>
        }
      />
    );
  const sets: SetLog[] =
    data.drafts[id] ??
    workout.exercises.flatMap((e) =>
      Array.from({ length: e.sets }, (_, i) => ({
        exerciseId: e.exerciseId,
        set: i + 1,
        kg: e.kg ?? 0,
        reps: e.reps,
        done: false,
      })),
    );
  const completed = sets.filter((s) => s.done).length;
  const updateSet = (exerciseId: string, set: number, patch: Partial<SetLog>) => {
    repository.saveDraft(
      id,
      sets.map((s) => (s.exerciseId === exerciseId && s.set === set ? { ...s, ...patch } : s)),
    );
    setError('');
  };
  const result = data.sessions.find((s) => s.id === sessionId);
  if (result)
    return (
      <>
        <PageHeader eyebrow="Sessão registrada" title="Mais um passo no seu percurso." />
        <Panel>
          <div className="completion">
            <CircleCheck size={52} strokeWidth={1.3} aria-hidden />
            <h2>Seu treino foi registrado na prévia.</h2>
            <p>
              {result.title} · {result.sets.length} séries · {result.duration} min. Os valores estão
              no histórico e no acompanhamento do personal durante esta sessão de demonstração.
            </p>
            <div className="form-actions">
              <Button asChild>
                <Link href="/aluno/historico">Revisar histórico</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/aluno">Voltar ao início</Link>
              </Button>
            </div>
          </div>
        </Panel>
      </>
    );
  return (
    <>
      <Link href="/aluno/treinos" className="text-link">
        <ArrowLeft size={16} />
        Meus treinos
      </Link>
      <PageHeader
        eyebrow="Seu treino do dia"
        title={workout.title}
        description={
          workout.notes ||
          'Registre a carga e as repetições executadas. Zero kg representa uma execução sem carga externa.'
        }
      />
      <div className="workout-session-layout">
        <Panel>
          {workout.exercises.map((prescription, index) => {
            const exercise = data.exercises.find((e) => e.id === prescription.exerciseId)!;
            return (
              <section
                className="session-exercise"
                key={exercise.id}
                id={`session-${exercise.id}`}
                tabIndex={-1}
              >
                <div className="session-exercise-heading">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h2>{exercise.name}</h2>
                    <p>
                      {prescription.sets} séries × {prescription.reps} reps · descanso prescrito{' '}
                      {prescription.rest}s
                    </p>
                  </div>
                </div>
                <p className="form-help mb-4">{exercise.instructions}</p>
                {(() => {
                  const previous = [...data.sessions]
                    .filter((s) => s.studentId === STUDENT_ID)
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .find((s) => s.sets.some((log) => log.exerciseId === exercise.id));
                  const last = previous?.sets.find((log) => log.exerciseId === exercise.id);
                  return (
                    last && (
                      <p className="previous-load">
                        Último registro:{' '}
                        <strong>
                          {last.kg} kg × {last.reps} reps
                        </strong>{' '}
                        · {formatDate(previous!.date)}
                      </p>
                    )
                  );
                })()}
                {sets
                  .filter((s) => s.exerciseId === exercise.id)
                  .map((log) => (
                    <div
                      className={`set-row ${log.done ? 'set-complete' : ''}`}
                      key={`${log.exerciseId}-${log.set}`}
                    >
                      <span className="set-number">Série {log.set}</span>
                      <Field label="Carga (kg)" htmlFor={`kg-${exercise.id}-${log.set}`}>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          inputMode="decimal"
                          id={`kg-${exercise.id}-${log.set}`}
                          aria-label={`Carga em kg, ${exercise.name}, série ${log.set}`}
                          value={Number.isFinite(log.kg) ? log.kg : ''}
                          onChange={(event) =>
                            updateSet(exercise.id, log.set, {
                              kg: event.target.value === '' ? NaN : Number(event.target.value),
                            })
                          }
                        />
                      </Field>
                      <Field label="Repetições" htmlFor={`reps-${exercise.id}-${log.set}`}>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          inputMode="numeric"
                          id={`reps-${exercise.id}-${log.set}`}
                          aria-label={`Repetições, ${exercise.name}, série ${log.set}`}
                          value={Number.isFinite(log.reps) ? log.reps : ''}
                          onChange={(event) =>
                            updateSet(exercise.id, log.set, {
                              reps: event.target.value === '' ? NaN : Number(event.target.value),
                            })
                          }
                        />
                      </Field>
                      <label className="set-check">
                        <input
                          type="checkbox"
                          checked={log.done}
                          aria-label={`Concluir ${exercise.name}, série ${log.set}`}
                          onChange={(event) =>
                            updateSet(exercise.id, log.set, { done: event.target.checked })
                          }
                        />
                      </label>
                    </div>
                  ))}
                <div className="exercise-flow-actions">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() =>
                      setRest((v) => ({ duration: prescription.rest, version: v.version + 1 }))
                    }
                  >
                    Descansar {prescription.rest}s
                  </Button>
                  {workout.exercises[index + 1] && (
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => {
                        const next = document.getElementById(
                          `session-${workout.exercises[index + 1].exerciseId}`,
                        );
                        next?.focus({ preventScroll: true });
                        next?.scrollIntoView({
                          block: 'start',
                          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                            ? 'auto'
                            : 'smooth',
                        });
                      }}
                    >
                      Próximo exercício
                    </Button>
                  )}
                </div>
              </section>
            );
          })}
        </Panel>
        <Panel className="session-summary">
          <h2>No seu ritmo.</h2>
          <p className="mb-5">Confira os valores e marque cada série que você executou.</p>
          <SessionProgress value={completed} max={sets.length} />
          <p className="sr-only" role="status">
            {completed} de {sets.length} séries concluídas.
          </p>
          <RestTimer key={rest.version} duration={rest.duration} autoStart={rest.version > 0} />
          <Feedback error={error} />
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                if (!data.drafts[id]) repository.saveDraft(id, sets);
                const resultId = await repository.finishWorkout(
                  id,
                  (Date.now() - (start.current ?? Date.now())) / 60000,
                );
                setSessionId(resultId);
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Registrando…' : 'Concluir treino'}
          </Button>
          <p className="form-help mt-4">
            As séries em aberto ficam em memória durante a navegação. Recarregar reinicia os dados.
          </p>
        </Panel>
      </div>
    </>
  );
}
