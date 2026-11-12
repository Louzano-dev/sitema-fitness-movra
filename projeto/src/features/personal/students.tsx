'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Plus, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDemo, useRepository } from '@/components/providers';
import {
  Avatar,
  EmptyState,
  Feedback,
  Field,
  PageHeader,
  Panel,
  Status,
  TableRegion,
} from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { errorMessage, studentSchema, type StudentInput } from '@/domain/schemas';
import { normalize, studentSessions, formatDate } from '@/domain/selectors';
import type { Student } from '@/domain/types';
export function StudentForm({
  student,
  onComplete,
}: {
  student?: Student;
  onComplete: () => void;
}) {
  const repository = useRepository();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<StudentInput>({
    resolver: zodResolver(studentSchema),
    defaultValues: student ?? { name: '', email: '', goal: '', status: 'Ativo' },
  });
  return (
    <form
      className="form-stack"
      onSubmit={handleSubmit(async (input) => {
        try {
          await repository.saveStudent(input, student?.id);
          onComplete();
        } catch (error) {
          setError('root', { message: errorMessage(error) });
        }
      })}
    >
      <Field label="Nome completo" htmlFor="student-name" error={errors.name?.message}>
        <Input
          id="student-name"
          {...register('name')}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'student-name-error' : undefined}
          autoComplete="off"
        />
      </Field>
      <Field label="E-mail fictício" htmlFor="student-email" error={errors.email?.message}>
        <Input
          id="student-email"
          type="email"
          {...register('email')}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'student-email-error' : undefined}
        />
      </Field>
      <Field label="Objetivo do acompanhamento" htmlFor="student-goal" error={errors.goal?.message}>
        <Textarea
          id="student-goal"
          {...register('goal')}
          aria-invalid={!!errors.goal}
          aria-describedby={errors.goal ? 'student-goal-error' : undefined}
        />
      </Field>
      <Field label="Situação" htmlFor="student-status">
        <select className="native-select" id="student-status" {...register('status')}>
          <option>Ativo</option>
          <option>Pausado</option>
        </select>
      </Field>
      <p className="form-help">
        Use somente dados fictícios. A alteração permanece em memória até recarregar.
      </p>
      <Feedback error={errors.root?.message} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? 'Atualizando…'
          : student
            ? 'Atualizar aluno na prévia'
            : 'Adicionar aluno na prévia'}
      </Button>
    </form>
  );
}
export function StudentsPage() {
  const data = useDemo();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Todos');
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState('');
  const students = data.students.filter(
    (s) =>
      normalize(`${s.name} ${s.email}`).includes(normalize(query)) &&
      (status === 'Todos' || status === s.status),
  );
  return (
    <>
      <PageHeader
        eyebrow="Gestão de alunos"
        title="Cada pessoa, um percurso."
        description="Encontre o contexto de cada aluno e mantenha o acompanhamento próximo."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={16} />
                Adicionar aluno
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Um novo acompanhamento.</DialogTitle>
                <DialogDescription>Crie um aluno fictício para explorar o fluxo.</DialogDescription>
              </DialogHeader>
              <StudentForm
                onComplete={() => {
                  setOpen(false);
                  setSuccess('Aluno adicionado nesta demonstração.');
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />
      <Feedback success={success} />
      <Panel>
        <div className="toolbar">
          <div className="search-field">
            <label className="sr-only" htmlFor="student-search">
              Buscar aluno
            </label>
            <Search size={17} aria-hidden />
            <Input
              id="student-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou e-mail"
            />
          </div>
          <label className="sr-only" htmlFor="student-filter">
            Filtrar situação
          </label>
          <select
            id="student-filter"
            className="native-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="Todos">Todas as situações</option>
            <option>Ativo</option>
            <option>Pausado</option>
          </select>
          <span className="toolbar-count" role="status">
            {students.length} alunos encontrados
          </span>
        </div>
        {students.length ? (
          <TableRegion label="Lista de alunos">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Aluno</th>
                  <th scope="col" className="mobile-hide">
                    Objetivo
                  </th>
                  <th scope="col">Situação</th>
                  <th scope="col" className="mobile-hide">
                    Último treino
                  </th>
                  <th scope="col">
                    <span className="sr-only">Abrir perfil</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="table-person">
                        <Avatar name={s.name} color={s.color} />
                        <div>
                          <strong>{s.name}</strong>
                          <p>{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="mobile-hide">
                      <span className="muted">{s.goal}</span>
                    </td>
                    <td>
                      <Status value={s.status} />
                    </td>
                    <td className="mobile-hide">
                      {studentSessions(data, s.id)[0]
                        ? formatDate(studentSessions(data, s.id)[0].date)
                        : 'Sem registro'}
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
        ) : (
          <EmptyState
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery('');
                  setStatus('Todos');
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        )}
      </Panel>
    </>
  );
}
