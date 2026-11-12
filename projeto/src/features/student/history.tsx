'use client';
import { useState } from 'react';
import { useDemo } from '@/components/providers';
import { EmptyState, PageHeader, Panel, TableRegion } from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { STUDENT_ID } from '@/domain/types';
import { formatDate, sessionVolume, studentSessions } from '@/domain/selectors';
export function HistoryPage() {
  const data = useDemo();
  const [period, setPeriod] = useState('all');
  const sessions = studentSessions(data, STUDENT_ID).filter(
    (s) => period === 'all' || s.date >= '2026-11-08',
  );
  return (
    <>
      <PageHeader
        eyebrow="Histórico de treinos"
        title="Cada registro conta uma parte."
        description="Revise o que você executou. As sessões preservam os valores registrados, mesmo se o treino for editado depois."
      />
      <Panel>
        <div className="toolbar">
          <label className="sr-only" htmlFor="history-period">
            Período do histórico
          </label>
          <select
            id="history-period"
            className="native-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="all">Todo o histórico</option>
            <option value="week">Desde 8 de novembro</option>
          </select>
          <span className="toolbar-count" role="status">
            {sessions.length} sessões registradas
          </span>
        </div>
        {sessions.length ? (
          sessions.map((s) => (
            <div className="history-row" key={s.id}>
              <div>
                <h3>{s.title}</h3>
                <p>
                  {formatDate(s.date)} · {s.duration} min · {s.sets.length} séries
                </p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Ver registro de ${s.title} em ${formatDate(s.date)}`}
                  >
                    Ver registro
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{s.title}</DialogTitle>
                    <DialogDescription>
                      {formatDate(s.date)} · {s.duration} min · registro demonstrativo
                    </DialogDescription>
                  </DialogHeader>
                  <TableRegion label="Séries registradas">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th scope="col">Exercício / série</th>
                          <th scope="col">kg</th>
                          <th scope="col">Reps</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.sets.map((log) => (
                          <tr key={`${log.exerciseId}-${log.set}`}>
                            <td>
                              {s.exerciseNames[log.exerciseId] ?? log.exerciseId} · {log.set}
                            </td>
                            <td>{log.kg}</td>
                            <td>{log.reps}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableRegion>
                  <p className="form-help">
                    Volume registrado: {sessionVolume(s.sets).toLocaleString('pt-BR')}{' '}
                    kg·repetições. Soma de carga × repetições; não é um indicador clínico.
                  </p>
                </DialogContent>
              </Dialog>
            </div>
          ))
        ) : (
          <EmptyState title="Sem sessões neste período." />
        )}
      </Panel>
    </>
  );
}
