'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  Plus,
  Users,
  Activity,
} from 'lucide-react';
import { useDemo } from '@/components/providers';
import {
  Avatar,
  PageHeader,
  Panel,
  Stat,
  Status,
  TableRegion,
  TextLink,
} from '@/components/shared';
import { Button } from '@/components/ui/button';
import { TrendChart } from '@/components/charts';
import { Brand } from '@/components/brand';
import { DEMO_DATE } from '@/domain/types';
import { formatDate, studentSessions } from '@/domain/selectors';
export function PersonalDashboard() {
  const data = useDemo();
  const [range, setRange] = useState(7);
  const today = data.appointments
    .filter((a) => a.date === DEMO_DATE && a.status === 'Agendado')
    .sort((a, b) => a.time.localeCompare(b.time));
  const chart = Array.from({ length: range }, (_, i) => {
    const d = new Date(`${DEMO_DATE}T12:00:00`);
    d.setDate(d.getDate() - (range - 1 - i));
    const date = d.toISOString().slice(0, 10);
    return {
      label: formatDate(date, { day: '2-digit', month: '2-digit' }),
      value: data.sessions.filter((s) => s.date === date).length,
    };
  });
  const attention = data.students.filter(
    (s) =>
      s.status === 'Ativo' &&
      (!studentSessions(data, s.id)[0] || studentSessions(data, s.id)[0].date < '2026-11-05'),
  );
  const periodStart = new Date(`${DEMO_DATE}T12:00:00`);
  periodStart.setDate(periodStart.getDate() - range + 1);
  const activeStudents = data.students.filter((s) => s.status === 'Ativo');
  const recordedStudents = activeStudents.filter((student) =>
    data.sessions.some(
      (session) =>
        session.studentId === student.id &&
        session.date >= periodStart.toISOString().slice(0, 10) &&
        session.date <= DEMO_DATE,
    ),
  ).length;
  return (
    <>
      <PageHeader
        eyebrow="Seu acompanhamento, de perto"
        title={`Bom dia, ${data.profiles.personal.name.split(' ')[0]}.`}
        description="Um novo dia para estar presente na evolução de cada pessoa."
        action={
          <Button asChild>
            <Link href="/personal/treinos/novo">
              <Plus size={16} />
              Criar treino
            </Link>
          </Button>
        }
      />
      <div className="welcome-banner">
        <div>
          <p className="eyebrow">Quinta-feira · 12 de novembro</p>
          <h2>Pequenos passos. Acompanhamento presente.</h2>
          <p>
            Você tem {today.length} encontros na agenda de hoje. Veja o contexto dos alunos e
            prepare o próximo contato.
          </p>
        </div>
        <div className="welcome-art" aria-hidden>
          <Brand compact />
        </div>
      </div>
      <div className="overview-actions">
        <div>
          <span className="eyebrow">Presença no período · {range} dias</span>
          <strong>
            {recordedStudents} de {activeStudents.length} alunos ativos com registro
          </strong>
          <div
            className="adherence-track"
            role="meter"
            aria-label="Alunos ativos com sessão registrada no período"
            aria-valuemin={0}
            aria-valuemax={activeStudents.length}
            aria-valuenow={recordedStudents}
          >
            <span
              style={{
                width: `${activeStudents.length ? (recordedStudents / activeStudents.length) * 100 : 0}%`,
              }}
            />
          </div>
          <p>
            Contagem de alunos com pelo menos uma sessão. Não representa treinos previstos ou taxa
            de retenção.
          </p>
        </div>
        <div className="quick-actions">
          <TextLink href="/personal/agenda">Organizar meu dia</TextLink>
          <TextLink href="/personal/exercicios">Consultar exercícios</TextLink>
        </div>
      </div>
      <div className="stats-grid">
        <Stat
          label="Alunos ativos"
          value={data.students
            .filter((s) => s.status === 'Ativo')
            .length.toString()
            .padStart(2, '0')}
          note={`${data.students.length} alunos neste espaço`}
          icon={Users}
        />
        <Stat
          label="Encontros hoje"
          value={String(today.length).padStart(2, '0')}
          note="Agendamentos confirmados na prévia"
          icon={CalendarDays}
        />
        <Stat
          label="Treinos disponíveis"
          value={String(data.workouts.length).padStart(2, '0')}
          note="Prescrições atribuídas aos alunos"
          icon={ClipboardList}
        />
        <Stat
          label="Sessões registradas"
          value={String(data.sessions.length).padStart(2, '0')}
          note="Histórico demonstrativo completo"
          icon={Activity}
        />
      </div>
      <div className="dashboard-grid">
        <Panel
          title="Constância em movimento"
          description={`Sessões registradas · últimos ${range} dias`}
          action={
            <div className="chart-toolbar">
              <label className="sr-only" htmlFor="dashboard-range">
                Período do gráfico
              </label>
              <select
                id="dashboard-range"
                value={range}
                onChange={(e) => setRange(Number(e.target.value))}
              >
                <option value={7}>Últimos 7 dias</option>
                <option value={30}>Últimos 30 dias</option>
              </select>
            </div>
          }
        >
          <TrendChart data={chart} label="Sessões registradas" unit="sessões" />
          <div className="panel-footer">
            <span className="legend">Sessões de todos os alunos</span>
            <TextLink href="/personal/evolucao">Ver evolução</TextLink>
          </div>
        </Panel>
        <Panel
          title="Sua agenda de hoje"
          description={`${today.length} encontros para acompanhar`}
          action={<CalendarDays size={18} aria-hidden />}
        >
          <div className="agenda-list">
            {today.map((a) => {
              const s = data.students.find((s) => s.id === a.studentId)!;
              return (
                <div className="agenda-row" key={a.id}>
                  <time className="agenda-time">{a.time}</time>
                  <Link className="agenda-person" href={`/personal/alunos/${s.id}`}>
                    <Avatar name={s.name} color={s.color} />
                    <div>
                      <strong>{s.name}</strong>
                      <p>
                        {a.kind} · {a.duration} min
                      </p>
                    </div>
                  </Link>
                  <ArrowUpRight size={15} className="muted" aria-hidden />
                </div>
              );
            })}
            {!today.length && <p className="form-help">Nenhum encontro agendado para hoje.</p>}
          </div>
          <div className="panel-footer">
            <span>Agenda de 12 nov</span>
            <TextLink href="/personal/agenda">Abrir agenda</TextLink>
          </div>
        </Panel>
      </div>
      <div className="dashboard-bottom">
        <Panel
          title="Pessoas por trás de cada treino"
          description="Sua carteira de alunos"
          action={<TextLink href="/personal/alunos">Ver todos</TextLink>}
        >
          <TableRegion label="Resumo dos alunos">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Aluno</th>
                  <th scope="col">Situação</th>
                  <th scope="col">
                    <span className="sr-only">Abrir perfil</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.students.slice(0, 4).map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="table-person">
                        <Avatar name={s.name} color={s.color} />
                        <div>
                          <strong>{s.name}</strong>
                          <p>Desde {formatDate(s.joinedAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Status value={s.status} />
                    </td>
                    <td>
                      <Link
                        className="table-action"
                        href={`/personal/alunos/${s.id}`}
                        aria-label={`Abrir perfil de ${s.name}`}
                      >
                        <ArrowUpRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableRegion>
        </Panel>
        <Panel
          title="Um contato faz diferença"
          description="Alunos sem registros nos últimos 7 dias"
        >
          <div className="attention-list">
            {attention.slice(0, 3).map((s) => (
              <div className="attention-row" key={s.id}>
                <Avatar name={s.name} color={s.color} small />
                <div>
                  <strong>{s.name}</strong>
                  <p>
                    {studentSessions(data, s.id)[0]
                      ? `Último registro: ${formatDate(studentSessions(data, s.id)[0].date)}`
                      : 'Ainda sem registros'}
                  </p>
                </div>
                <Link
                  className="table-action"
                  href={`/personal/alunos/${s.id}`}
                  aria-label={`Acompanhar ${s.name}`}
                >
                  <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          </div>
          <div className="panel-footer">
            <span>Presença começa no acompanhamento.</span>
          </div>
        </Panel>
      </div>
    </>
  );
}
