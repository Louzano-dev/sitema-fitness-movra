'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useDemo, useRepository } from '@/components/providers';
import {
  EmptyState,
  Feedback,
  Field,
  PageHeader,
  Panel,
  Stat,
  TableRegion,
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
import { TrendChart } from '@/components/charts';
import { DEMO_DATE, STUDENT_ID } from '@/domain/types';
import { errorMessage } from '@/domain/schemas';
import { formatDate, studentMeasurements } from '@/domain/selectors';
export function ProgressPage({
  studentView = false,
  initialStudent,
}: {
  studentView?: boolean;
  initialStudent?: string;
}) {
  const data = useDemo();
  const repository = useRepository();
  const [student, setStudent] = useState(initialStudent ?? STUDENT_ID);
  const [metric, setMetric] = useState<'weight' | 'waist'>('weight');
  const [period, setPeriod] = useState('all');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const id = studentView ? STUDENT_ID : student;
  const records = studentMeasurements(data, id);
  const visible = records.filter((m) => period === 'all' || m.date >= '2026-10-01');
  const last = records.at(-1);
  const first = visible[0];
  const unit = metric === 'weight' ? 'kg' : 'cm';
  const label = metric === 'weight' ? 'Peso' : 'Cintura';
  return (
    <>
      <PageHeader
        eyebrow={studentView ? 'Sua evolução' : 'Evolução física'}
        title="O progresso tem o seu tempo."
        description="Medidas ao longo do acompanhamento, sem comparação com outras pessoas ou interpretação clínica."
        action={
          !studentView && (
            <Dialog
              open={open}
              onOpenChange={(value) => {
                setOpen(value);
                setError('');
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus size={16} />
                  Registrar avaliação
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar avaliação</DialogTitle>
                  <DialogDescription>Medidas fictícias para o aluno selecionado.</DialogDescription>
                </DialogHeader>
                <form
                  className="form-stack"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    setBusy(true);
                    setError('');
                    try {
                      await repository.saveMeasurement({
                        studentId: id,
                        date: String(form.get('date')),
                        weight: Number(form.get('weight')),
                        waist: Number(form.get('waist')),
                      });
                      setOpen(false);
                      setSuccess('Avaliação registrada nesta demonstração.');
                    } catch (e) {
                      setError(errorMessage(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Field label="Aluno">
                    <p>{data.students.find((s) => s.id === id)?.name}</p>
                  </Field>
                  <Field label="Data da avaliação" htmlFor="measurement-date">
                    <Input
                      id="measurement-date"
                      name="date"
                      type="date"
                      defaultValue={DEMO_DATE}
                      max={DEMO_DATE}
                      required
                    />
                  </Field>
                  <div className="form-grid">
                    <Field label="Peso (kg)" htmlFor="measurement-weight">
                      <Input
                        id="measurement-weight"
                        name="weight"
                        type="number"
                        min="0.1"
                        step="0.1"
                        max="500"
                        required
                      />
                    </Field>
                    <Field label="Cintura (cm)" htmlFor="measurement-waist">
                      <Input
                        id="measurement-waist"
                        name="waist"
                        type="number"
                        min="0.1"
                        step="0.1"
                        max="300"
                        required
                      />
                    </Field>
                  </div>
                  <Feedback error={error} />
                  <Button type="submit" disabled={busy}>
                    {busy ? 'Registrando…' : 'Registrar na prévia'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      />
      <Feedback success={success} />
      <div className="toolbar mb-6 rounded-xl border bg-white">
        {!studentView && (
          <Field label="Aluno" htmlFor="progress-student">
            <select
              className="native-select"
              id="progress-student"
              value={student}
              onChange={(e) => setStudent(e.target.value)}
            >
              {data.students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Medida" htmlFor="progress-metric">
          <select
            className="native-select"
            id="progress-metric"
            value={metric}
            onChange={(e) => setMetric(e.target.value as 'weight' | 'waist')}
          >
            <option value="weight">Peso (kg)</option>
            <option value="waist">Cintura (cm)</option>
          </select>
        </Field>
        <Field label="Período" htmlFor="progress-period">
          <select
            className="native-select"
            id="progress-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="all">Todo o acompanhamento</option>
            <option value="recent">Desde outubro de 2026</option>
          </select>
        </Field>
      </div>
      {last ? (
        <>
          <div className="stats-grid">
            <Stat
              label="Último peso registrado"
              value={`${last.weight.toLocaleString('pt-BR')} kg`}
              note={formatDate(last.date)}
            />
            <Stat
              label="Última cintura registrada"
              value={`${last.waist.toLocaleString('pt-BR')} cm`}
              note={formatDate(last.date)}
            />
            <Stat
              label="Avaliações no período"
              value={visible.length}
              note="Registros disponíveis no filtro"
            />
            <Stat
              label={`Variação · ${label.toLowerCase()}`}
              value={
                visible.length > 1
                  ? `${(visible.at(-1)![metric] - first[metric]).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unit}`
                  : '—'
              }
              note="Última menos primeira medida"
            />
          </div>
          <Panel
            title={`${label} ao longo do tempo`}
            description="Registros demonstrativos, sem inferência sobre saúde"
          >
            {visible.length ? (
              <TrendChart
                kind="line"
                data={visible.map((m) => ({ label: formatDate(m.date), value: m[metric] }))}
                label={label}
                unit={unit}
              />
            ) : (
              <EmptyState title="Sem avaliações neste período." />
            )}
          </Panel>
          <Panel title="Histórico de avaliações" className="section-gap">
            <TableRegion label="Medidas por avaliação">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Data</th>
                    <th scope="col">Peso (kg)</th>
                    <th scope="col">Cintura (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((m) => (
                    <tr key={m.id}>
                      <td>{formatDate(m.date)}</td>
                      <td>{m.weight.toLocaleString('pt-BR')}</td>
                      <td>{m.waist.toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableRegion>
          </Panel>
        </>
      ) : (
        <Panel>
          <EmptyState
            title="O primeiro registro ainda está por vir."
            description="As avaliações realizadas pelo personal aparecerão aqui."
          />
        </Panel>
      )}
    </>
  );
}
