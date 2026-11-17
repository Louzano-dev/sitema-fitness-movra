'use client';
import { useDemo } from '@/components/providers';
import { useDemoSession } from '@/components/demo-session';
import { EmptyState, PageHeader, Panel, Status } from '@/components/shared';
import { formatDate } from '@/domain/selectors';
export function StudentAgenda() {
  const data = useDemo();
  const { studentId } = useDemoSession();
  const appointments = data.appointments
    .filter((a) => a.studentId === studentId)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return (
    <>
      <PageHeader
        eyebrow="Meus encontros"
        title="Um tempo para acompanhar."
        description="Agenda fictícia organizada pelo personal. Sem confirmação ou notificação externa."
      />
      <Panel>
        {appointments.length ? (
          appointments.map((a) => (
            <div className="agenda-entry" key={a.id}>
              <time>
                {formatDate(a.date)} · {a.time}
              </time>
              <div>
                <strong>
                  {a.kind} · {a.duration} min
                </strong>
                <p>Com {data.profiles.personal.name}</p>
              </div>
              <Status value={a.status} />
            </div>
          ))
        ) : (
          <EmptyState title="Nenhum encontro por aqui." />
        )}
      </Panel>
    </>
  );
}
