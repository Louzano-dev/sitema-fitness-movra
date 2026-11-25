'use client';
import { useState, useSyncExternalStore } from 'react';
import { useDemoSession } from '@/components/demo-session';
import { professionalService, linkAllows } from '@/services/professional-service';
import { currentWorkspaceAppointments } from '@/services/connect-workspace';
import { connectService, type ConnectAccount } from '@/services/connect-service';
import { CalendarDays, Plus, Video } from 'lucide-react';
import { useDemo, useRepository } from '@/components/providers';
import {
  Avatar,
  EmptyState,
  Feedback,
  Field,
  PageHeader,
  Panel,
  Status,
} from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DEMO_DATE, type Appointment } from '@/domain/types';
import { addDays, civilDate } from '@/domain/habits';
import { errorMessage } from '@/domain/schemas';
import { formatDate } from '@/domain/selectors';
function CancelAppointment({
  appointment,
  onCancelled,
}: {
  appointment: Appointment;
  onCancelled: () => void;
}) {
  const repository = useRepository();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Cancelar sessão
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar este encontro?</DialogTitle>
          <DialogDescription>
            O encontro de {formatDate(appointment.date)} às {appointment.time} ficará no histórico
            como cancelado.
          </DialogDescription>
        </DialogHeader>
        <Feedback error={error} />
        <div className="form-actions">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Manter sessão
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await repository.cancelAppointment(appointment.id);
                setOpen(false);
                onCancelled();
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Confirmar cancelamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function AgendaPage() {
  const data = useDemo();
  const repository = useRepository();
  const { session } = useDemoSession();
  const account = session?.account;
  useSyncExternalStore(professionalService.subscribe, professionalService.revision, () => 0);
  useSyncExternalStore(connectService.subscribe, connectService.revision, () => 0);
  const students = data.students.filter(
    (s) => !account || !s.id.startsWith('s-') || linkAllows(account.id, s.id, 'appointments'),
  );
  const firstDay = account ? civilDate() : DEMO_DATE;
  const [date, setDate] = useState(firstDay);
  const [editing, setEditing] = useState<Appointment>();
  const [showCanceled, setShowCanceled] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  const appointments = data.appointments
    .filter((a) => a.date === date && (showCanceled || a.status === 'Agendado'))
    .sort((a, b) => a.time.localeCompare(b.time));
  const days = Array.from({ length: 7 }, (_, index) => addDays(firstDay, index));
  return (
    <>
      <PageHeader
        eyebrow="Acompanhamento"
        title="Agenda"
        description="Organize os encontros com seus alunos e os horários de atendimento."
        action={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setEditing(undefined);
              setError('');
            }}
          >
            <DialogTrigger asChild>
              <Button disabled={!students.length}>
                <Plus size={16} />
                Agendar encontro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Reagendar encontro' : 'Agendar encontro'}</DialogTitle>
                <DialogDescription>
                  O encontro será salvo na agenda local do personal e do aluno vinculado.
                </DialogDescription>
              </DialogHeader>
              <form
                className="form-stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const values = new FormData(e.currentTarget);
                  setBusy(true);
                  setError('');
                  try {
                    const nextDate = String(values.get('date'));
                    await repository.saveAppointment(
                      {
                        studentId: editing?.studentId ?? String(values.get('studentId')),
                        date: nextDate,
                        time: String(values.get('time')),
                        duration: Number(values.get('duration')),
                        kind: values.get('kind') as 'Presencial' | 'Online',
                      },
                      editing?.id,
                    );
                    setDate(nextDate);
                    setOpen(false);
                    setSuccess(
                      editing ? 'Encontro reagendado.' : 'Encontro agendado.',
                    );
                    setEditing(undefined);
                  } catch (err) {
                    setError(errorMessage(err));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Field label="Aluno" htmlFor="appointment-student">
                  <select
                    className="native-select"
                    id="appointment-student"
                    name="studentId"
                    defaultValue={editing?.studentId}
                    disabled={!!editing}
                    required
                  >
                    <option value="">Selecione o aluno</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="form-grid">
                  <Field label="Data" htmlFor="appointment-date">
                    <Input
                      id="appointment-date"
                      type="date"
                      name="date"
                      min={firstDay}
                      defaultValue={editing?.date ?? (date || firstDay)}
                      required
                    />
                  </Field>
                  <Field label="Horário" htmlFor="appointment-time">
                    <Input
                      id="appointment-time"
                      type="time"
                      name="time"
                      defaultValue={editing?.time}
                      required
                    />
                  </Field>
                  <Field label="Duração (min)" htmlFor="appointment-duration">
                    <Input
                      id="appointment-duration"
                      type="number"
                      name="duration"
                      min={15}
                      max={180}
                      defaultValue={editing?.duration ?? 60}
                      required
                    />
                  </Field>
                  <Field label="Formato" htmlFor="appointment-kind">
                    <select
                      className="native-select"
                      id="appointment-kind"
                      name="kind"
                      defaultValue={editing?.kind}
                    >
                      <option>Presencial</option>
                      <option>Online</option>
                    </select>
                  </Field>
                </div>
                <Feedback error={error} />
                <Button type="submit" disabled={busy}>
                  {busy ? 'Salvando…' : editing ? 'Salvar novo horário' : 'Salvar agendamento'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <Feedback success={success} />
      {!open && <Feedback error={error} />}
      {!!date && account?.role === 'personal' && (
        <Availability account={account} date={date} />
      )}
      <Panel>
        <div className="toolbar">
          <Field label="Dia da agenda" htmlFor="agenda-date">
            <Input
              type="date"
              id="agenda-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={showCanceled}
              onChange={(e) => setShowCanceled(e.target.checked)}
            />
            Mostrar cancelados
          </label>
          <span className="toolbar-count" role="status">
            {appointments.length} encontros nesta data
          </span>
        </div>
        <div className="date-strip" aria-label="Próximos sete dias">
          {days.map((day) => (
            <button
              key={day}
              className={`date-button ${date === day ? 'active' : ''}`}
              aria-pressed={date === day}
              aria-label={formatDate(day, { day: 'numeric', month: 'long', weekday: 'long' })}
              onClick={() => setDate(day)}
            >
              <span>{formatDate(day, { weekday: 'short' }).replace('.', '')}</span>
              <strong>{day.slice(-2)}</strong>
            </button>
          ))}
        </div>
        {appointments.length ? (
          appointments.map((a) => {
            const s = data.students.find((s) => s.id === a.studentId)!;
            return (
              <div className="agenda-entry" key={a.id}>
                <time>{a.time}</time>
                <div className="agenda-person">
                  <Avatar name={s.name} color={s.color} />
                  <div>
                    <strong>{s.name}</strong>
                    <p className="flex items-center gap-2">
                      {a.kind === 'Online' ? (
                        <Video size={13} aria-hidden />
                      ) : (
                        <CalendarDays size={13} aria-hidden />
                      )}
                      {a.kind} · {a.duration} min ·{' '}
                      <Status
                        value={a.confirmed && a.status === 'Agendado' ? 'Confirmado' : a.status}
                      />
                    </p>
                    {!!a.previous?.length && (
                      <small>
                        Horários anteriores:{' '}
                        {a.previous.map((p) => formatDate(p.date) + ' ' + p.time).join(', ')}
                      </small>
                    )}
                  </div>
                </div>
                {a.status === 'Agendado' && (
                  <div className="flex flex-wrap gap-1">
                    {students.some((s) => s.id === a.studentId) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditing(a);
                            setError('');
                            setOpen(true);
                          }}
                        >
                          Reagendar
                        </Button>
                        {!a.confirmed && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                await repository.confirmAppointment(a.id);
                                setError('');
                                setSuccess('Encontro confirmado.');
                              } catch (e) {
                                setError(errorMessage(e));
                              }
                            }}
                          >
                            Confirmar encontro
                          </Button>
                        )}
                      </>
                    )}
                    <CancelAppointment
                      appointment={a}
                      onCancelled={() =>
                        setSuccess(
                          'Encontro cancelado. O horário está livre novamente.',
                        )
                      }
                    />
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <EmptyState
            title="Um espaço livre na agenda."
            description="Nenhum encontro nesta data com os filtros atuais."
          />
        )}
      </Panel>
    </>
  );
}

function Availability({ account, date }: { account: ConnectAccount; date: string }) {
  const [error, setError] = useState(''),
    [success, setSuccess] = useState('');
  const rows = professionalService.slots(account.id, date);
  return (
    <Panel>
      <details>
        <summary className="cursor-pointer py-2">
          Disponibilidade e bloqueios · {formatDate(date)}
        </summary>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget),
              start = String(f.get('start')),
              end = String(f.get('end')),
              kind = f.get('kind') as 'Disponível' | 'Bloqueado';
            try {
              setError('');
              setSuccess('');
              await professionalService.setSlot(account.id, { date, start, end, kind }, () =>
                currentWorkspaceAppointments(account),
              );
              setSuccess('Faixa de horário salva.');
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
        >
          <div className="form-grid">
            <Field label="Tipo de faixa" htmlFor="availability-kind">
              <select id="availability-kind" className="native-select" name="kind">
                <option>Disponível</option>
                <option>Bloqueado</option>
              </select>
            </Field>
            <Field label="Início" htmlFor="availability-start">
              <Input id="availability-start" type="time" name="start" required />
            </Field>
            <Field label="Fim" htmlFor="availability-end">
              <Input id="availability-end" type="time" name="end" required />
            </Field>
          </div>
          <Button>Salvar faixa</Button>
        </form>
        {rows.map((r) => (
          <div className="flex items-center gap-3" key={r.id}>
            <span>
              {r.start}–{r.end} · {r.kind}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await professionalService.removeSlot(account.id, r.id);
                  setError('');
                  setSuccess('Faixa removida.');
                } catch (e) {
                  setError(errorMessage(e));
                }
              }}
            >
              Remover faixa
            </Button>
          </div>
        ))}
        <Feedback error={error} success={success} />
      </details>
    </Panel>
  );
}
