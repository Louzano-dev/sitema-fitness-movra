'use client';
import { useEffect, useRef, useState } from 'react';
import { Award, CalendarDays, Check, LockKeyhole, Minus } from 'lucide-react';
import { useDemoSession } from '@/components/demo-session';
import { useDemo, useRepository } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Feedback, Field } from '@/components/shared';
import { Input } from '@/components/ui/input';
import { WEEKDAYS } from '@/domain/experience';
import {
  activitiesFor,
  addDays,
  civilDate,
  consistency,
  completionReward,
  type CompletionReward,
  moveSession,
  newRoutine,
  pauseRoutine,
  setWeekdays,
  stages,
  weekdaysAt,
  type Routine,
} from '@/domain/habits';
import { formatDate } from '@/domain/selectors';
import { Companion } from './companion';
import { WorkoutShareButton } from './workout-share';
import './habits.css';

const labelDate = (d: string) =>
  formatDate(d, { weekday: 'short', day: 'numeric', month: 'short' });
function useRoutine() {
  const { studentId } = useDemoSession();
  const data = useDemo();
  const routine = data.experience.habits?.[studentId] ?? newRoutine();
  const [today, setToday] = useState(() => civilDate(new Date(), routine.zone));
  useEffect(() => {
    const refresh = () => setToday(civilDate(new Date(), routine.zone));
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [routine.zone]);
  const activities = activitiesFor(data, studentId);
  return { data, studentId, routine, today, activities };
}

function useOnscreen() {
  const ref = useRef<HTMLDivElement>(null);
  const [onscreen, setOnscreen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let intersecting = typeof IntersectionObserver === 'undefined';
    const sync = () => setOnscreen(intersecting && !document.hidden);
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            intersecting = entry.isIntersecting;
            sync();
          });
    observer?.observe(node);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);
  return { ref, onscreen };
}

function HabitFire({ burst = false }: { burst?: boolean }) {
  return (
    <span className="habit-fire" data-burst={burst} aria-hidden="true">
      <svg viewBox="0 0 28 30" width="25" height="27" focusable="false">
        <path
          fill="#ff9749"
          d="M13.5 1.5c.7 5-3.2 7.8-6 11.3-1-1-1.4-2.5-1.2-4.2C2.6 12.8 1.7 16.7 3 21c1.3 4.4 5.6 7 10.7 7.2 6.4.2 11.3-4 11.5-10.2.1-4.3-2.3-8.3-5.7-10.9.5 2.2.1 4.2-.9 5.5.1-4.3-2.4-8.3-5.1-11.1Z"
        />
        <path
          fill="#ffe08b"
          d="M13.6 13.5c.2 3.2-2.4 4.5-3.7 6.1-.9 1-.9 2.6-.4 3.9.7 1.8 2.4 2.8 4.5 2.8 2.8 0 4.8-1.8 4.9-4.5.1-2-1.1-3.7-2.5-4.9.1 1.3-.2 2-.7 2.5-.1-2-.8-4-2.1-5.9Z"
        />
      </svg>
      {burst && (
        <>
          <i />
          <i />
          <i />
        </>
      )}
    </span>
  );
}

export function HabitCelebration({ reward }: { reward: CompletionReward }) {
  const { ref, onscreen } = useOnscreen();
  return (
    <div
      ref={ref}
      className="habit-celebration"
      data-onscreen={onscreen}
      data-event={reward.id}
      role="status"
    >
      <div className="habit-reward-figure">
        <Companion stage={reward.stage} pose="celebrate" />
      </div>
      <div>
        <strong className="habit-reward-title">
          <HabitFire burst /> Treino concluído!
        </strong>
        <p>
          {reward.advanced
            ? `${reward.weekly} de ${reward.target} nesta semana · ${reward.streak} em sequência.`
            : 'Atividade salva no seu histórico.'}
        </p>
        {reward.unlocked.map((item) => (
          <span className="habit-unlock" key={item.id}>
            <Award size={14} aria-hidden />
            {item.title}
          </span>
        ))}
      </div>
    </div>
  );
}

type Progress = ReturnType<typeof consistency>;

function HabitBanner({ progress, studentId }: { progress: Progress; studentId: string }) {
  const { ref, onscreen } = useOnscreen();
  const repo = useRepository();
  const [evolution, setEvolution] = useState<number | null>(null);
  const { stage } = progress;
  useEffect(() => {
    if (!onscreen) return;
    const frame = window.requestAnimationFrame(() => {
      const routine = repo.getSnapshot().experience.habits?.[studentId];
      const from = routine?.seenStage ?? 0;
      if (!routine?.visible || stage <= from) return;
      repo.updateExperience((state) => ({
        ...state,
        habits: { ...state.habits, [studentId]: { ...routine, seenStage: stage } },
      }));
      setEvolution(from);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [onscreen, repo, stage, studentId]);
  useEffect(() => {
    if (!onscreen || evolution === null) return;
    const timer = window.setTimeout(() => setEvolution(null), 3600);
    return () => window.clearTimeout(timer);
  }, [onscreen, evolution]);
  return (
    <div
      ref={ref}
      className="habit-banner"
      data-onscreen={onscreen}
      data-evolving={evolution !== null}
    >
      <div className="habit-banner-copy">
        <p className="habit-label">
          <HabitFire burst={evolution !== null} /> Sua sequência
        </p>
        <h2>
          <strong>{progress.streak}</strong>{' '}
          <span>
            {progress.streak === 1
              ? 'treino programado concluído'
              : 'treinos programados concluídos'}{' '}
            em sequência
          </span>
        </h2>
        <p className="habit-best">Melhor sequência: {progress.bestStreak}</p>
        <p className="habit-stage-label">
          Estágio {stage + 1} <span>·</span> {stages[stage].name}
        </p>
        {evolution !== null && (
          <p role="status" className="habit-evolved">
            Você evoluiu! {stages[evolution].name} → {stages[stage].name}
          </p>
        )}
      </div>
      <div className="habit-companion" aria-hidden="true">
        {evolution !== null && (
          <div className="habit-previous-stage">
            <Companion stage={evolution} pose="idle" />
          </div>
        )}
        <div className="habit-current-stage">
          <Companion stage={stage} pose={evolution !== null ? 'celebrate' : 'idle'} />
        </div>
      </div>
    </div>
  );
}

function EvolutionDetails({ progress }: { progress: Progress }) {
  const next = stages[progress.stage + 1];
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const selected = preview ?? progress.stage;
  return (
    <details
      className="habit-tools habit-evolution-details"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>Evolução e conquistas</summary>
      <div className="habit-detail-content">
        <p>
          {next
            ? `Próxima meta: ${next.name} · ${progress.goalWeeks} de ${next.weeks} semanas com meta alcançada.`
            : `Elite · ${progress.goalWeeks} semanas com meta alcançada.`}
        </p>
        {next && (
          <progress
            value={progress.goalWeeks}
            max={next.weeks}
            aria-label={`Semanas para o estágio ${next.name}`}
          />
        )}
        <p className="form-help">
          As metas contam no encerramento da semana. Cada estágio libera uma nova pose do seu
          atleta.
        </p>
        <ol className="habit-stages" aria-label="Estágios do seu atleta">
          {stages.map((item, i) => (
            <li key={item.name} aria-current={i === progress.stage ? 'step' : undefined}>
              {i <= progress.stage ? (
                <button
                  type="button"
                  aria-pressed={selected === i}
                  aria-label={`Ver pose do estágio ${item.name}`}
                  onClick={() => setPreview(i)}
                >
                  <Check size={14} aria-hidden /> {item.name}
                  {i === progress.stage && ' · atual'}
                </button>
              ) : (
                <span>
                  <LockKeyhole size={13} aria-hidden /> {item.name}
                </span>
              )}
              <small>
                {i ? `${item.weeks} ${item.weeks === 1 ? 'semana' : 'semanas'}` : 'Desde o início'}
              </small>
            </li>
          ))}
        </ol>
        {open && (
          <figure className="habit-pose-preview">
            <div>
              <Companion key={selected} stage={selected} pose="celebrate" />
            </div>
            <figcaption>Pose desbloqueada · {stages[selected].name}</figcaption>
          </figure>
        )}
        {progress.achievements.length > 0 ? (
          <>
            <h3>Conquistas desbloqueadas</h3>
            <ul className="habit-awards">
              {progress.achievements.map((item) => (
                <li key={item.id}>
                  <Award size={15} aria-hidden />
                  {item.title}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="form-help">
            Conclua seu primeiro treino para desbloquear a primeira conquista.
          </p>
        )}
      </div>
    </details>
  );
}
export function HabitsPanel({ settings = false }: { settings?: boolean }) {
  const { data, studentId, routine, activities, today } = useRoutine();
  const repo = useRepository();
  const progress = consistency(routine, activities, today);
  const days = weekdaysAt(routine, addDays(today, 1));
  const [selection, select] = useState<number[] | null>(null);
  const [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [reward, setReward] = useState<CompletionReward | null>(null);
  const [registeredId, setRegisteredId] = useState<string>();
  const registered = data.sessions.find(
    (item) => item.id === registeredId && item.studentId === studentId,
  );
  const selected = selection ?? days;
  const initial = !routine.plans.length;
  const latest = data.workouts.find((w) => w.studentId === studentId && w.weekday);
  const prescribed = latest
    ? [
        ...new Set(
          data.workouts
            .filter(
              (w) =>
                w.studentId === studentId &&
                (latest.programId
                  ? w.programId === latest.programId && w.versionId === latest.versionId
                  : w.id === latest.id),
            )
            .map((w) => WEEKDAYS.findIndex((d) => d === w.weekday))
            .filter((i) => i >= 0),
        ),
      ].sort((a, b) => a - b)
    : [];
  const update = (change: (current: Routine) => Routine, feedback: string) => {
    try {
      repo.updateExperience((state) => ({
        ...state,
        habits: { ...state.habits, [studentId]: change(state.habits?.[studentId] ?? routine) },
      }));
      setMessage(feedback);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Confira os dados da rotina.');
      setMessage('');
    }
  };
  const saveDays = (values: number[]) => {
    update(
      (r) => setWeekdays(r, values, today),
      initial ? 'Preferência de rotina salva.' : 'Rotina atualizada a partir de amanhã.',
    );
    select(null);
  };
  const saveRoutine = (
    <div className="habit-editor">
      <fieldset>
        <legend>Em quais dias você costuma treinar?</legend>
        <div className="habit-weekdays">
          {WEEKDAYS.map((day, index) => (
            <label key={day}>
              <input
                type="checkbox"
                checked={selected.includes(index)}
                onChange={(event) =>
                  select(
                    event.target.checked
                      ? [...selected, index]
                      : selected.filter((i) => i !== index),
                  )
                }
              />
              {day}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="form-help">
        {initial
          ? 'Você também pode começar sem definir dias.'
          : 'As mudanças de dias valem a partir de amanhã.'}{' '}
        A rotina não reserva horários na agenda do personal.
      </p>
      <div className="form-actions">
        <Button type="button" onClick={() => saveDays(selected)} disabled={!selected.length}>
          Salvar dias de treino
        </Button>
        <Button type="button" variant="outline" onClick={() => saveDays([])}>
          Ainda não tenho uma rotina definida
        </Button>
      </div>
      {prescribed.length > 0 && String(prescribed) !== String([...days].sort()) && (
        <p className="form-help">
          Dias da ficha recebida: {prescribed.map((i) => WEEKDAYS[i]).join(', ')}.{' '}
          <button className="text-link" onClick={() => select(prescribed)}>
            Selecionar dias da ficha
          </button>
        </p>
      )}
    </div>
  );
  return (
    <section className="panel habits-panel" aria-label="Minha rotina" data-settings={settings}>
      {!settings && routine.visible && (
        <HabitBanner key={studentId} progress={progress} studentId={studentId} />
      )}
      <div className="habit-body">
        <div className="habit-week-heading">
          <h2>
            <CalendarDays size={18} aria-hidden /> Minha rotina
          </h2>
          {progress.target > 0 && (
            <span>
              {progress.weekly} de {progress.target} nesta semana
            </span>
          )}
        </div>
        <ul className="habit-calendar" aria-label="Atividade desta semana">
          {progress.days.map((d, index) => {
            const label = d.activity
              ? d.planned && d.done
                ? 'treino planejado concluído'
                : 'atividade extra'
              : d.planned
                ? 'planejado'
                : initial
                  ? 'sem rotina definida'
                  : 'descanso';
            return (
              <li
                key={d.date}
                data-done={d.activity}
                data-planned={d.planned}
                aria-current={d.date === today ? 'date' : undefined}
                aria-label={`${labelDate(d.date)}: ${label}`}
                title={`${labelDate(d.date)} · ${label}`}
              >
                <span aria-hidden>{WEEKDAYS[index].slice(0, 3)}</span>
                <strong aria-hidden>
                  {d.activity ? (
                    <Check size={15} />
                  ) : !d.planned && !initial ? (
                    <Minus size={13} />
                  ) : (
                    Number(d.date.slice(-2))
                  )}
                </strong>
              </li>
            );
          })}
        </ul>
        {progress.target > 0 && (
          <progress
            className="habit-week-progress"
            value={progress.weekly}
            max={progress.target}
            aria-label="Treinos programados concluídos nesta semana"
          />
        )}
        {initial && (
          <p className="habit-calendar-note">Escolha seus dias para definir a meta semanal.</p>
        )}
        {!initial && (
          <p className="habit-calendar-note">
            {progress.next
              ? `Próximo treino: ${labelDate(progress.next)}.`
              : 'Nenhum dia planejado.'}{' '}
            <span>Traço indica descanso.</span>
          </p>
        )}
        {!settings && routine.visible && (
          <>
            {progress.achievements.at(-1) && (
              <p className="habit-latest">
                <Award size={15} aria-hidden /> {progress.achievements.at(-1)?.title}
              </p>
            )}
            <EvolutionDetails progress={progress} />
          </>
        )}
        {settings && initial ? (
          saveRoutine
        ) : (
          <details className="habit-tools">
            <summary>
              {initial ? 'Definir meus dias de treino' : 'Editar dias e preferências'}
            </summary>
            {saveRoutine}
          </details>
        )}
        {settings && (
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={routine.visible}
              onChange={(e) => {
                const visible = e.currentTarget.checked;
                update((r) => ({ ...r, visible }), 'Preferência salva.');
              }}
            />{' '}
            Mostrar sequência e mascote
          </label>
        )}
        {!initial && days.length > 0 && (
          <details className="habit-tools">
            <summary>Pausar ou reagendar a rotina</summary>
            {routine.pauses
              .filter((p) => p.through >= today)
              .map((p, i) => (
                <p key={i}>
                  Pausa de {labelDate(p.from)} até {labelDate(p.through)}.
                </p>
              ))}
            {routine.moves
              .filter((p) => p.to >= today)
              .map((p, i) => (
                <p key={i}>
                  Reposição de {labelDate(p.from)} em {labelDate(p.to)}.
                </p>
              ))}
            <form
              className="habit-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                update(
                  (r) =>
                    pauseRoutine(r, String(f.get('from')), String(f.get('to')), today, activities),
                  'Pausa registrada. Os dias de pausa ficam fora da meta.',
                );
              }}
            >
              <Field label="Pausar a partir de" htmlFor="habit-pause-start">
                <Input id="habit-pause-start" type="date" name="from" min={today} required />
              </Field>
              <Field label="Até o dia" htmlFor="habit-pause-end">
                <Input id="habit-pause-end" type="date" name="to" min={today} required />
              </Field>
              <Button variant="outline">Pausar rotina</Button>
            </form>
            <form
              className="habit-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                update(
                  (r) =>
                    moveSession(r, String(f.get('from')), String(f.get('to')), today, activities),
                  'Sessão reagendada. A meta considera a nova data.',
                );
              }}
            >
              <Field label="Dia planejado" htmlFor="habit-move-from">
                <Input id="habit-move-from" type="date" name="from" min={today} required />
              </Field>
              <Field label="Novo dia" htmlFor="habit-move-to">
                <Input id="habit-move-to" type="date" name="to" min={today} required />
              </Field>
              <Button variant="outline">Reagendar sessão</Button>
            </form>
          </details>
        )}
        {!settings && (
          <details className="habit-tools">
            <summary>Registrar treino sem ficha</summary>
            <form
              className="habit-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                try {
                  const before = repo.getSnapshot();
                  const id = repo.recordIndependentWorkout(
                    studentId,
                    String(f.get('activity')),
                    Number(f.get('minutes')),
                    f.get('extra') === 'on',
                  );
                  setReward(completionReward(before, repo.getSnapshot(), studentId, id));
                  setRegisteredId(id);
                  e.currentTarget.reset();
                  setMessage('Treino declarado no histórico de hoje.');
                  setError('');
                } catch (reason) {
                  setMessage('');
                  setError(reason instanceof Error ? reason.message : 'Confira a atividade.');
                }
              }}
            >
              <Field label="Atividade realizada" htmlFor="habit-activity">
                <Input id="habit-activity" name="activity" required minLength={2} maxLength={100} />
              </Field>
              <Field label="Duração em minutos" htmlFor="habit-minutes">
                <Input
                  id="habit-minutes"
                  name="minutes"
                  type="number"
                  min={1}
                  max={1440}
                  required
                />
              </Field>
              <label className="checkbox-row">
                <input type="checkbox" name="extra" />
                Treino extra, fora da meta
              </label>
              <Button>Registrar atividade de hoje</Button>
            </form>
          </details>
        )}
        {routine.visible && reward && <HabitCelebration key={reward.id} reward={reward} />}
        {registered && <WorkoutShareButton source={{ kind: 'workout', session: registered }} />}
        <Feedback success={message} error={error} />
      </div>
    </section>
  );
}
