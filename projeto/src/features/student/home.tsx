'use client';
import { LOGIN_POSTER } from '../login-media';
import './home.css';
import { useDemoSession } from '@/components/demo-session';
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Clock3,
  MessageCircle,
  Dumbbell,
  Layers,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { trainingWeek } from '@/domain/training-week';
import { connectService } from '@/services/connect-service';
import { featuredWorkouts } from '@/domain/student-library';
import { useDemo } from '@/components/providers';
import { EmptyState, PageHeader, Panel, TextLink } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { DEMO_DATE } from '@/domain/types';
import { formatDate, studentSessions } from '@/domain/selectors';
import { WorkoutCards } from '@/features/personal/workouts';
import { FuelOverview } from '@/features/fuel';
import { HabitsPanel } from './habits';
import { civilDate } from '@/domain/habits';
export function StudentHome() {
  const { studentId: activeStudentId, session } = useDemoSession();
  const data = useDemo();
  const sessions = studentSessions(data, activeStudentId);
  const workouts = featuredWorkouts(
    data.workouts,
    activeStudentId,
    data.experience.libraries?.[activeStudentId],
  );
  const date = civilDate(new Date(), data.experience.habits?.[activeStudentId]?.zone);
  const today = data.appointments
    .filter(
      (a) =>
        a.studentId === activeStudentId &&
        a.date >= (session?.account ? date : DEMO_DATE) &&
        a.status === 'Agendado',
    )
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const { next: workout, weekday } = trainingWeek(workouts, sessions, date);
  return (
    <>
      <PageHeader
        eyebrow={formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}
        title={`Olá, ${data.profiles.aluno.name.split(' ')[0]}.`}
      />

      <div className="athlete-today">
        <div className="athlete-priority">
          <section className="athlete-session" aria-labelledby="active-session-name">
            <div
              className="athlete-session-photo"
              aria-hidden="true"
              style={{ backgroundImage: 'url("' + LOGIN_POSTER + '")' }}
            />
            <div className="athlete-session-content">
              <p className="eyebrow">
                {workout?.weekday && workout.weekday !== weekday
                  ? 'Próximo dia programado · ' + workout.weekday
                  : 'Seu treino do dia'}
              </p>
              <h2 id="active-session-name">
                {workout?.title ?? 'Sua primeira ficha começa aqui.'}
              </h2>
              {workout ? (
                <div className="athlete-prescription">
                  <span>
                    <Dumbbell size={16} aria-hidden />
                    {workout.exercises.length} exercícios
                  </span>
                  <span>
                    <Layers size={16} aria-hidden />
                    {workout.exercises.reduce((sum, e) => sum + e.sets, 0)} séries
                  </span>
                </div>
              ) : (
                <p>
                  Encontre um personal para receber sua ficha ou registre um treino por conta
                  própria em Minha rotina.
                </p>
              )}
              {workout ? (
                <Button asChild className="athlete-start">
                  <Link href={`/aluno/treinos/${workout.id}`}>
                    {data.drafts[workout.id]?.some((s) => s.done)
                      ? 'Continuar meu treino'
                      : 'Começar meu treino'}
                    <ArrowRight size={17} />
                  </Link>
                </Button>
              ) : (
                <Button asChild className="athlete-start">
                  <Link href="/aluno/marketplace">
                    Encontrar personal <ArrowRight size={17} />
                  </Link>
                </Button>
              )}
            </div>
          </section>
          <nav className="athlete-shortcuts" aria-label="Atalhos do acompanhamento">
            <Link href="/aluno/treinos">
              <ClipboardList aria-hidden /> Meus treinos
            </Link>
            <Link href="/aluno/conversas">
              <MessageCircle aria-hidden /> Conversas
            </Link>
            <Link href="/aluno/personal">
              <UserRound aria-hidden /> Meu personal
            </Link>
          </nav>
        </div>
        <HabitsPanel />
      </div>
      <div className="student-home-grid">
        <Panel title="Atividade recente">
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
            <TextLink href="/aluno/evolucao">Ver evolução</TextLink>
            <TextLink href="/aluno/historico">Ver histórico</TextLink>
          </div>
        </Panel>
        <Panel title="Próximo encontro">
          <div className="panel-body">
            {today[0] ? (
              <>
                <CalendarDays size={26} className="muted mb-4" aria-hidden />
                <h3>{formatDate(today[0].date, { day: 'numeric', month: 'long' })}</h3>
                <p className="muted mt-2">
                  {today[0].time} · {today[0].duration} min · {today[0].kind}
                </p>
                <p className="form-help mt-5">
                  Com{' '}
                  {today[0].trainerId
                    ? (connectService.getAccount(today[0].trainerId)?.name ?? 'seu personal')
                    : data.profiles.personal.name}
                  . Agendamento demonstrativo feito no espaço do personal.
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
    </>
  );
}
export { StudentWorkouts } from './library';
