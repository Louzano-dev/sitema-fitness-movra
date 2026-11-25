'use client';
import { useDemo } from '@/components/providers';
import { useDemoSession } from '@/components/demo-session';
import { connectService } from '@/services/connect-service';
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
        eyebrow="Acompanhamento"
        title="Meus encontros"
        description="Horários combinados com o personal e salvos neste navegador."
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
                <p>
                  Com{' '}
                  {a.trainerId
                    ? (connectService.getAccount(a.trainerId)?.name ?? 'Personal da sessão')
                    : data.profiles.personal.name}
                </p>
                {!!a.previous?.length && (
                  <small>Reagendado · {a.previous.length} alteração(ões)</small>
                )}
              </div>
              <Status value={a.status === 'Agendado' && a.confirmed ? 'Confirmado' : a.status} />
            </div>
          ))
        ) : (
          <EmptyState
            title="Nenhum encontro agendado."
            description="Você pode seguir seus treinos normalmente."
          />
        )}
      </Panel>
    </>
  );
}
