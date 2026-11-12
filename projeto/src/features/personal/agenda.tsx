'use client';
import { useState } from 'react';
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
import { errorMessage } from '@/domain/schemas';
import { formatDate } from '@/domain/selectors';
function CancelAppointment({ appointment }: { appointment: Appointment }) {
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
            O agendamento de {formatDate(appointment.date)} às {appointment.time} será marcado como
            cancelado apenas nesta demonstração.
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
  const [date, setDate] = useState(DEMO_DATE);
  const [showCanceled, setShowCanceled] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  const appointments = data.appointments
    .filter((a) => a.date === date && (showCanceled || a.status === 'Agendado'))
    .sort((a, b) => a.time.localeCompare(b.time));
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(`${DEMO_DATE}T12:00:00`);
    day.setDate(day.getDate() + i);
    return day.toISOString().slice(0, 10);
  });
  return (
    <>
      <PageHeader
        eyebrow="Agenda e agendamentos"
        title="Tempo reservado para acompanhar."
        description="Organize os encontros e mantenha uma rotina de presença."
        action={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              setError('');
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus size={16} />
                Agendar encontro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Um próximo encontro.</DialogTitle>
                <DialogDescription>
                  Crie um agendamento fictício. Conflitos de horário são verificados nesta agenda.
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
                    await repository.saveAppointment({
                      studentId: String(values.get('studentId')),
                      date: nextDate,
                      time: String(values.get('time')),
                      duration: Number(values.get('duration')),
                      kind: values.get('kind') as 'Presencial' | 'Online',
                    });
                    setDate(nextDate);
                    setOpen(false);
                    setSuccess('Encontro adicionado nesta demonstração.');
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
                    required
                  >
                    <option value="">Selecione o aluno</option>
                    {data.students.map((s) => (
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
                      min={DEMO_DATE}
                      defaultValue={date}
                      required
                    />
                  </Field>
                  <Field label="Horário" htmlFor="appointment-time">
                    <Input id="appointment-time" type="time" name="time" required />
                  </Field>
                  <Field label="Duração (min)" htmlFor="appointment-duration">
                    <Input
                      id="appointment-duration"
                      type="number"
                      name="duration"
                      min={15}
                      max={180}
                      defaultValue={60}
                      required
                    />
                  </Field>
                  <Field label="Formato" htmlFor="appointment-kind">
                    <select className="native-select" id="appointment-kind" name="kind">
                      <option>Presencial</option>
                      <option>Online</option>
                    </select>
                  </Field>
                </div>
                <Feedback error={error} />
                <Button type="submit" disabled={busy}>
                  {busy ? 'Agendando…' : 'Agendar na prévia'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <Feedback success={success} />
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
                      {a.kind} · {a.duration} min · <Status value={a.status} />
                    </p>
                  </div>
                </div>
                {a.status === 'Agendado' && <CancelAppointment appointment={a} />}
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
