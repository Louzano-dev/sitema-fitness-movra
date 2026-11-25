'use client';
import { useDemoSession } from '@/components/demo-session';
import { CardioExecution } from '../cardio';
import { HabitCelebration } from './habits';
import { WorkoutShareButton } from './workout-share';
import { completionReward, type CompletionReward } from '@/domain/habits';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ArrowLeft, CircleCheck, Pause, Play, SkipForward } from 'lucide-react';
import { libraryKey } from '@/domain/student-library';
import { WorkoutOutline } from '@/components/workout-outline';
import { useDemo, useRepository } from '@/components/providers';
import { EmptyState, Feedback, Field, PageHeader, Panel } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/domain/schemas';
import type { SetLog } from '@/domain/types';
import { formatDate, sessionVolume } from '@/domain/selectors';
import { motion } from '@/components/motion';
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
          { scaleX: fraction, duration: motion.surface, ease: motion.ease },
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
  const [running, setRunning] = useState(autoStart && duration > 0);
  const deadline = useRef(0);
  useEffect(() => {
    if (!running) return;
    if (!deadline.current) deadline.current = Date.now() + duration * 1000;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setSeconds(remaining);
      if (!remaining) setRunning(false);
    }, 1000);
    return () => clearInterval(interval);
  }, [running, duration]);
  return (
    <div className="timer" data-running={running}>
      <p>Descanso opcional</p>
      <strong role="timer" aria-label="Tempo de descanso" aria-live="off">
        {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
      </strong>
      <div className="timer-actions">
        <Button
          variant="outline"
          size="sm"
          type="button"
          aria-label={running ? 'Pausar descanso' : `Iniciar descanso de ${duration} segundos`}
          onClick={() => {
            if (running) {
              setSeconds(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
              setRunning(false);
            } else {
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
          aria-label="Adicionar 15 segundos de descanso"
          disabled={!seconds}
          onClick={() => {
            const next =
              (running ? Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)) : seconds) +
              15;
            setSeconds(next);
            deadline.current = Date.now() + next * 1000;
          }}
        >
          +15 s
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
  const { studentId } = useDemoSession();
  return <WorkoutExecution key={studentId + '/' + id} id={id} activeStudentId={studentId} />;
}
function WorkoutExecution({ id, activeStudentId }: { id: string; activeStudentId: string }) {
  const data = useDemo();
  const repository = useRepository();
  const workout = data.workouts.find((w) => w.id === id && w.studentId === activeStudentId && data.experience.libraries?.[activeStudentId]?.entries[libraryKey(w)] !== 'removed');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [offerManual, setOfferManual] = useState(false);
  const [priorCardio] = useState(
    () =>
      new Set(
        data.workoutCheckpoints?.[id]?.previousCardioIds ??
          (data.experience.cardioRecords ?? [])
            .filter((r) => r.workoutId === id && r.studentId === activeStudentId)
            .map((r) => r.id),
      ),
  );
  const [sessionId, setSessionId] = useState<string>();
  const [reward, setReward] = useState<CompletionReward | null>(null);
  const [paused, setPaused] = useState(false);
  const elapsed = useRef(data.workoutCheckpoints?.[id]?.elapsedMs ?? 0);
  const finished = useRef(false);
  const [note, setNote] = useState('');
  const [rest, setRest] = useState({ duration: 60, version: 0 });
  const start = useRef<number | null>(null);
  useEffect(() => {
    if (!workout?.exercises.length || paused || sessionId) return;
    start.current = Date.now();
    function checkpoint() {
      if (finished.current || start.current === null) return;
      elapsed.current += Math.max(0, Date.now() - start.current);
      start.current = null;
      repository.saveWorkoutCheckpoint(id, {
        elapsedMs: elapsed.current,
        previousCardioIds: [...priorCardio],
      });
    }
    function resume() {
      if (!finished.current && start.current === null) start.current = Date.now();
    }
    window.addEventListener('pagehide', checkpoint);
    window.addEventListener('pageshow', resume);
    return () => {
      window.removeEventListener('pagehide', checkpoint);
      window.removeEventListener('pageshow', resume);
      checkpoint();
    };
  }, [id, paused, priorCardio, repository, sessionId, workout?.exercises.length]);
  useEffect(() => {
    if (sessionId) {
      const heading = document.querySelector<HTMLElement>('.completion h2');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus();
    }
  }, [sessionId]);
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
  if (!workout.exercises.length)
    return (
      <>
        <PageHeader eyebrow="Sessão independente de cardio" title={workout.title} />
        <CardioExecution workout={workout} position="Antes" />
        <CardioExecution workout={workout} position="Depois" />
        <Button asChild variant="outline">
          <Link href="/aluno/historico">Consultar histórico</Link>
        </Button>
      </>
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
      sets.map((s) =>
        s.exerciseId === exerciseId && s.set === set
          ? {
              ...s,
              ...patch,
              ...(patch.kg !== undefined || patch.reps !== undefined ? { done: false } : {}),
            }
          : s,
      ),
    );
    setError('');
  };
  const result = data.sessions.find((s) => s.id === sessionId);
  const priorSession = result
    ? data.sessions.find(
        (session) =>
          session.id !== result.id &&
          session.studentId === activeStudentId &&
          session.workoutId === result.workoutId,
      )
    : undefined;
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
            {result.source === 'manual' && <p>Conclusão declarada por você, sem séries registradas.</p>}
            {reward && <HabitCelebration key={reward.id} reward={reward} />}
            <div className="form-actions">
              <WorkoutShareButton source={{ kind: 'workout', session: result }} primary />
              <Button asChild variant="outline">
                <Link href="/aluno/historico">Revisar histórico</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/aluno">Voltar ao início</Link>
              </Button>
            </div>
            <p>
              {new Set(result.sets.map((set) => set.exerciseId)).size} exercícios concluídos ·
              versão {result.versionId ?? 'ficha demonstrativa original'}
            </p>
            <p className="form-help">
              Volume registrado: {sessionVolume(result.sets).toLocaleString('pt-BR')} kg·repetições.
              {priorSession
                ? ` Registro anterior desta ficha em ${formatDate(priorSession.date)}: ${sessionVolume(priorSession.sets).toLocaleString('pt-BR')} kg·repetições, ${priorSession.sets.length} séries e ${priorSession.duration} min.`
                : ' Primeiro registro desta ficha/versão; ainda não há sessão anterior para comparar.'}{' '}
              Soma descritiva de carga × repetições, sem avaliação clínica ou pontuação.
            </p>
            {(data.experience.cardioRecords ?? [])
              .filter(
                (r) =>
                  r.workoutId === id && r.studentId === activeStudentId && !priorCardio.has(r.id),
              )
              .map((r) => (
                <p key={r.id}>
                  Cardio registrado · {r.prescription.modality.name} · {Math.floor(r.seconds / 60)}{' '}
                  min {r.seconds % 60}s {r.notes}
                </p>
              ))}
            <Field label="Feedback ao personal (opcional)" htmlFor="session-feedback">
              <Textarea
                id="session-feedback"
                maxLength={500}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
            <Button
              variant="outline"
              onClick={() => {
                repository.saveSessionNote(result.id, note, activeStudentId);
                setFeedback('Feedback registrado nesta sessão fictícia.');
              }}
            >
              Salvar feedback da sessão
            </Button>
            <Feedback success={feedback} />
          </div>
        </Panel>
      </>
    );
  async function finish(manual: boolean) {
    if (finished.current || busy || paused) return;
    if (!manual && !completed) {
      setOfferManual(true);
      setError('Você ainda não marcou séries. Registre as séries executadas ou confirme a conclusão manual.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const before = repository.getSnapshot();
      const resultId = await repository.finishWorkout(id,
        (elapsed.current + Math.max(0, Date.now() - (start.current ?? Date.now()))) / 60000,
        activeStudentId, '', manual ? 'manual' : 'recorded');
      finished.current = true;
      setReward(completionReward(before, repository.getSnapshot(), activeStudentId, resultId));
      setSessionId(resultId);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
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
      <details className="studio-tools">
        <summary>Consultar ficha completa · {workout.exercises.length} exercícios</summary>
        <WorkoutOutline workout={workout} library={data.exercises} />
      </details>
      <CardioExecution workout={workout} position="Antes" />
      <div className="form-actions">
        <Button variant="outline" onClick={() => setPaused((value) => !value)}>
          {paused ? 'Retomar sessão' : 'Pausar sessão'}
        </Button>
        <span role="status">
          {paused
            ? 'Sessão pausada. Use Retomar sessão para continuar.'
            : 'Registre as séries no seu ritmo.'}
        </span>
      </div>
      <div className="workout-session-layout">
        <div className="session-timer-dock">
          <SessionProgress value={completed} max={sets.length} />
          <p className="sr-only" role="status">
            {completed} de {sets.length} séries concluídas.
          </p>
          <RestTimer key={rest.version} duration={rest.duration} autoStart={rest.version > 0} />
        </div>
        <Panel className="session-exercises">
          <fieldset disabled={paused}>
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
                      <p className="eyebrow">
                        Exercício {index + 1} de {workout.exercises.length}
                      </p>
                      <h2>{exercise.name}</h2>
                      <p role="status">
                        {sets.filter((s) => s.exerciseId === exercise.id && s.done).length} de{' '}
                        {prescription.sets} séries concluídas
                      </p>
                      <p>
                        {prescription.sets} séries × {prescription.reps}
                        {prescription.repsMax ? `–${prescription.repsMax}` : ''} reps · descanso
                        prescrito {prescription.rest}s
                      </p>
                    </div>
                  </div>
                  <p className="form-help mb-4">{exercise.instructions}</p>
                  {!exercise.id.startsWith('own-') && (
                    <small>
                      Orientação de catálogo · demonstração técnica pendente de validação.
                    </small>
                  )}
                  {prescription.rir !== undefined && (
                    <p>Repetições em reserva orientadas: {prescription.rir}</p>
                  )}
                  {prescription.rpe !== undefined && (
                    <p>Esforço orientado: {prescription.rpe}/10</p>
                  )}
                  {prescription.kg !== undefined && (
                    <p className="previous-load">
                      Carga orientada pelo personal: {prescription.kg} kg
                    </p>
                  )}
                  {prescription.notes && (
                    <aside className="personal-instruction">
                      <strong>Orientação do personal</strong>
                      <p>{prescription.notes}</p>
                    </aside>
                  )}
                  {(() => {
                    const previous = [...data.sessions]
                      .filter((s) => s.studentId === activeStudentId)
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .find((s) =>
                        s.sets.some(
                          (log) => log.exerciseId.split('--')[0] === exercise.id.split('--')[0],
                        ),
                      );
                    const last = previous?.sets.find(
                      (log) => log.exerciseId.split('--')[0] === exercise.id.split('--')[0],
                    );
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
                        <Field
                          label="Carga (kg)"
                          htmlFor={`kg-${exercise.id}-${log.set}`}
                          error={
                            !Number.isFinite(log.kg) || log.kg < 0 || log.kg > 1000
                              ? 'Use de 0 a 1.000 kg.'
                              : undefined
                          }
                        >
                          <Input
                            type="number"
                            min={0}
                            max={1000}
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
                        <Field
                          label="Repetições"
                          htmlFor={`reps-${exercise.id}-${log.set}`}
                          error={
                            !Number.isInteger(log.reps) || log.reps < 1 || log.reps > 100
                              ? 'Use de 1 a 100 reps.'
                              : undefined
                          }
                        >
                          <Input
                            type="number"
                            min={1}
                            max={100}
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
                            onChange={(event) => {
                              if (
                                event.target.checked &&
                                (!Number.isFinite(log.kg) ||
                                  log.kg < 0 ||
                                  log.kg > 1000 ||
                                  !Number.isInteger(log.reps) ||
                                  log.reps < 1 ||
                                  log.reps > 100)
                              ) {
                                setError(
                                  'Revise a carga e as repetições antes de concluir esta série.',
                                );
                                const field =
                                  !Number.isFinite(log.kg) || log.kg < 0 || log.kg > 1000
                                    ? 'kg'
                                    : 'reps';
                                document
                                  .getElementById(`${field}-${exercise.id}-${log.set}`)
                                  ?.focus();
                                return;
                              }
                              updateSet(exercise.id, log.set, { done: event.target.checked });
                            }}
                          />
                          <span aria-hidden>{log.done ? 'Registrada' : 'Registrar'}</span>
                        </label>
                      </div>
                    ))}
                  <div className="exercise-flow-actions">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => {
                        const first = sets.find((s) => s.exerciseId === exercise.id);
                        if (
                          !first ||
                          !Number.isFinite(first.kg) ||
                          first.kg < 0 ||
                          first.kg > 1000 ||
                          !Number.isInteger(first.reps) ||
                          first.reps < 1 ||
                          first.reps > 100
                        ) {
                          setError('Preencha valores válidos na primeira série para repetir.');
                          return;
                        }
                        repository.saveDraft(
                          id,
                          sets.map((s) =>
                            s.exerciseId === exercise.id && s.set > 1 && !s.done
                              ? { ...s, kg: first.kg, reps: first.reps }
                              : s,
                          ),
                        );
                        setFeedback(
                          `Valores da primeira série repetidos nas séries em aberto de ${exercise.name}.`,
                        );
                      }}
                    >
                      Repetir primeira série
                    </Button>
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
          </fieldset>
        </Panel>
        <CardioExecution workout={workout} position="Depois" />
        <Panel className="session-summary">
          <h2>No seu ritmo.</h2>
          <p className="mb-5">Confira os valores e marque cada série que você executou.</p>
          <Feedback error={error} success={feedback} />
          <Button
            disabled={busy || paused}
            onClick={() => finish(false)}
          >
            {busy ? 'Registrando…' : 'Concluir treino'}
          </Button>
          {offerManual && !completed && <Button variant="outline" disabled={busy || paused} onClick={() => finish(true)}>
            Confirmar que concluí sem registrar séries
          </Button>}
          <p className="form-help mt-4">
            Séries válidas são salvas localmente quando o navegador permite. Recarregar encerra a
            visualização, mas mantém o rascunho salvo.
          </p>
        </Panel>
      </div>
    </>
  );
}
