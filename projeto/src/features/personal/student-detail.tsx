'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { useDemo } from '@/components/providers';
import {
  Avatar,
  EmptyState,
  Feedback,
  PageHeader,
  Panel,
  Status,
  TextLink,
} from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { StudentForm } from './students';
import { formatDate, studentSessions } from '@/domain/selectors';
import { WorkoutCards } from './workouts';
export function StudentDetail({ id }: { id: string }) {
  const data = useDemo();
  const student = data.students.find((s) => s.id === id);
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState('');
  if (!student)
    return (
      <EmptyState
        title="Aluno não encontrado."
        description="Este aluno pode ter sido criado em uma sessão anterior. Recarregar restaura os dados iniciais."
        action={
          <Button asChild>
            <Link href="/personal/alunos">Voltar aos alunos</Link>
          </Button>
        }
      />
    );
  const sessions = studentSessions(data, id);
  const workouts = data.workouts.filter((w) => w.studentId === id);
  return (
    <>
      <Link href="/personal/alunos" className="text-link">
        <ArrowLeft size={16} />
        Voltar aos alunos
      </Link>
      <PageHeader
        eyebrow="Perfil do aluno"
        title="Um olhar para o percurso."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Pencil size={15} />
                Editar aluno
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar acompanhamento</DialogTitle>
                <DialogDescription>
                  Atualização local dos dados fictícios do aluno.
                </DialogDescription>
              </DialogHeader>
              <StudentForm
                student={student}
                onComplete={() => {
                  setOpen(false);
                  setSuccess('Perfil atualizado na demonstração.');
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />
      <Feedback success={success} />
      <Panel>
        <div className="detail-hero">
          <Avatar name={student.name} color={student.color} />
          <div>
            <h2>{student.name}</h2>
            <p>{student.goal}</p>
            <div className="mt-3">
              <Status value={student.status} />
            </div>
          </div>
        </div>
        <dl className="detail-meta">
          <div>
            <dt>E-mail</dt>
            <dd>{student.email}</dd>
          </div>
          <div>
            <dt>Início do acompanhamento</dt>
            <dd>
              {formatDate(student.joinedAt, { day: '2-digit', month: 'long', year: 'numeric' })}
            </dd>
          </div>
          <div>
            <dt>Registros disponíveis</dt>
            <dd>
              {sessions.length} sessões · {workouts.length} treinos
            </dd>
          </div>
        </dl>
      </Panel>
      <div className="section-gap">
        <div className="page-heading">
          <h2>Treinos atribuídos</h2>
          <Button asChild variant="outline">
            <Link href={`/personal/treinos/novo?aluno=${id}`}>
              <Plus size={15} />
              Criar treino
            </Link>
          </Button>
        </div>
        <WorkoutCards workouts={workouts} />
      </div>
      <div className="two-columns section-gap">
        <Panel
          title="Últimas sessões"
          description="Execuções registradas, preservadas como histórico"
        >
          <div>
            {sessions.length ? (
              sessions.slice(0, 4).map((s) => (
                <div key={s.id} className="history-row">
                  <div>
                    <h3>{s.title}</h3>
                    <p>
                      {formatDate(s.date)} · {s.duration} min · {s.sets.length} séries
                    </p>
                  </div>
                  <Status value="Concluído" />
                </div>
              ))
            ) : (
              <EmptyState
                title="Ainda sem sessões."
                description="O primeiro treino registrado aparecerá aqui."
              />
            )}
          </div>
        </Panel>
        <Panel
          title="Evolução individual"
          description="Medidas registradas, sem interpretação clínica"
        >
          <div className="panel-body">
            <p className="form-help">
              Acompanhe as medidas desta pessoa ao longo do tempo. Os dados deste ambiente são
              demonstrativos.
            </p>
            <TextLink href={`/personal/evolucao?aluno=${id}`}>
              Ver evolução de {student.name.split(' ')[0]}
            </TextLink>
          </div>
        </Panel>
      </div>
    </>
  );
}
