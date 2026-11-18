'use client';
import { useDemoSession } from '@/components/demo-session';
import { ArrowRight, CalendarDays, ClipboardList, Clock3, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { trainingWeek } from '@/domain/training-week';
import { Brand } from '@/components/brand';
import { useDemo } from '@/components/providers';
import { EmptyState, PageHeader, Panel, TextLink } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { DEMO_DATE } from '@/domain/types';
import { formatDate, studentSessions } from '@/domain/selectors';
import { WorkoutCards } from '@/features/personal/workouts';
import { FuelOverview } from '@/features/fuel';
export function StudentHome() {
  const { studentId: activeStudentId } = useDemoSession();
  const data = useDemo();
  const sessions = studentSessions(data, activeStudentId);
  const workouts = data.workouts.filter((w) => w.studentId === activeStudentId);
  const today = data.appointments
    .filter(
      (a) => a.studentId === activeStudentId && a.date >= DEMO_DATE && a.status === 'Agendado',
    )
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const { next: workout, weekday } = trainingWeek(workouts, sessions, DEMO_DATE);
  return (
    <>
      <PageHeader
        eyebrow="Quinta-feira · 12 de novembro"
        title={`Olá, ${data.profiles.aluno.name.split(' ')[0]}.`}
        description="Seu próximo passo pode começar por aqui."
      />
      <section className="student-welcome">
        <div>
          <p className="eyebrow">
            {workout?.weekday && workout.weekday !== weekday
              ? 'Próximo dia programado · ' + workout.weekday
              : 'Seu treino do dia'}
          </p>
          <h2>{workout?.title ?? 'Um novo treino está por vir.'}</h2>
          <p>
            {workout
              ? `${workout.exercises.length} exercícios · ${workout.exercises.reduce((sum, e) => sum + e.sets, 0)} séries · no seu ritmo.`
              : 'Quando seu personal preparar um treino, ele aparecerá aqui.'}
          </p>
          {workout && (
            <Button asChild className="start-button">
              <Link href={`/aluno/treinos/${workout.id}`}>
                Começar meu treino
                <ArrowRight size={17} />
              </Link>
            </Button>
          )}
        </div>
        <div className="student-welcome-art" aria-hidden>
          <Brand compact />
        </div>
      </section>
      <div className="student-shortcuts">
        <TextLink href="/aluno/alimentacao">Registrar alimentação</TextLink>
        <TextLink href="/aluno/evolucao">Ver meu progresso</TextLink>
      </div>
      <div className="student-home-grid">
        <Panel title="Seu percurso até aqui" description="Sessões disponíveis no histórico">
          <div className="student-metric-strip">
            <div>
              <span>Sessões registradas</span>
              <strong>{sessions.length}</strong>
            </div>
            <div>
              <span>Tempo registrado</span>
              <strong>
                {sessions.reduce((sum, s) => sum + s.duration, 0)} <span>min</span>
              </strong>
            </div>
            <div>
              <span>Treinos disponíveis</span>
              <strong>{workouts.length}</strong>
            </div>
          </div>
          {sessions.slice(0, 2).map((s) => (
            <div className="history-row" key={s.id}>
              <div>
                <h3>{s.title}</h3>
                <p>
                  {formatDate(s.date)} · {s.duration} min
                </p>
              </div>
              <Clock3 size={17} className="muted" aria-hidden />
            </div>
          ))}
          <div className="panel-footer">
            <span>Um registro de cada vez.</span>
            <TextLink href="/aluno/historico">Ver histórico</TextLink>
          </div>
        </Panel>
        <Panel title="Próximo encontro" description="Um momento para acompanhar de perto">
          <div className="panel-body">
            {today[0] ? (
              <>
                <CalendarDays size={26} className="muted mb-4" aria-hidden />
                <h3>{formatDate(today[0].date, { day: 'numeric', month: 'long' })}</h3>
                <p className="muted mt-2">
                  {today[0].time} · {today[0].duration} min · {today[0].kind}
                </p>
                <p className="form-help mt-5">
                  Com {data.profiles.personal.name}. Agendamento demonstrativo feito no espaço do
                  personal.
                </p>
              </>
            ) : (
              <EmptyState title="Nenhum encontro agendado." />
            )}
          </div>
        </Panel>
      </div>
      <FuelOverview />
      <div className="section-gap">
        <div className="page-heading">
          <h2 className="flex items-center gap-2">
            <ClipboardList size={19} aria-hidden />
            Seus treinos
          </h2>
          <TextLink href="/aluno/treinos">Ver todos</TextLink>
        </div>
        <WorkoutCards workouts={workouts.slice(0, 2)} studentView />
      </div>
      <p className="form-help section-gap flex items-center gap-2">
        <Sparkles size={15} aria-hidden />A evolução acontece no seu tempo. Acompanhe seu próprio
        percurso.
      </p>
    </>
  );
}
export function StudentWorkouts() {
  const { studentId: activeStudentId } = useDemoSession();
  const data = useDemo();
  const assigned = data.workouts.filter((w) => w.studentId === activeStudentId);
  const week = trainingWeek(assigned, studentSessions(data, activeStudentId), DEMO_DATE);
  const previous = assigned.filter((w) => !week.active.includes(w));
  return (
    <>
      <PageHeader
        eyebrow={`Semana de ${formatDate(week.dates[0])} a ${formatDate(week.dates[6])}`}
        title="Meus treinos"
        description="Veja os treinos atribuídos pelo personal e escolha qual deseja registrar."
      />
      {week.next && (
        <p className="training-next">
          Próximo treino sugerido <strong>{week.next.title}</strong>
          {week.next.weekday && ' · ' + week.next.weekday}
        </p>
      )}
      <WorkoutCards workouts={week.active} studentView />
      {previous.length > 0 && (
        <details className="studio-tools">
          <summary>Fichas de versões anteriores</summary>
          <WorkoutCards workouts={previous} studentView />
        </details>
      )}
    </>
  );
}
