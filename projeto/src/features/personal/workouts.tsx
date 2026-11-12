'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ClipboardList, Layers, Plus, Search, UserRound } from 'lucide-react';
import { useDemo, useRepository } from '@/components/providers';
import { Feedback } from '@/components/shared';
import { errorMessage } from '@/domain/schemas';
import { EmptyState, PageHeader, Panel } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Workout } from '@/domain/types';
import { normalize, formatDate } from '@/domain/selectors';
export function WorkoutCards({
  workouts,
  studentView = false,
}: {
  workouts: Workout[];
  studentView?: boolean;
}) {
  const data = useDemo();
  const repository = useRepository();
  const [feedback, setFeedback] = useState('');
  const [failure, setFailure] = useState('');
  if (!workouts.length)
    return (
      <Panel>
        <EmptyState
          title="Nenhum treino disponível."
          description={
            studentView
              ? 'Quando seu personal atribuir um treino, ele aparecerá aqui.'
              : 'Crie um treino e atribua a um aluno.'
          }
        />
      </Panel>
    );
  return (
    <div>
      <Feedback success={feedback} error={failure} />
      <div className="workout-grid">
        {workouts.map((w) => (
          <Panel className="workout-card" key={w.id}>
            <div className="workout-card-header">
              <span className="workout-card-icon">
                <ClipboardList size={21} aria-hidden />
              </span>
              <span className="tag">Prescrição demonstrativa</span>
            </div>
            <h2>{w.title}</h2>
            <p>
              {studentView
                ? 'Uma etapa de cada vez.'
                : data.students.find((s) => s.id === w.studentId)?.name}
            </p>
            <div className="workout-card-meta">
              <span>
                <Layers size={14} aria-hidden />
                {w.exercises.length} exercícios
              </span>
              <span>{w.exercises.reduce((sum, e) => sum + e.sets, 0)} séries</span>
            </div>
            <div className="workout-card-footer">
              {!studentView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    setFailure('');
                    try {
                      await repository.saveWorkout({ ...w, title: `${w.title} (cópia)` });
                      setFeedback(
                        'Ficha duplicada nesta demonstração. Abra a cópia para personalizar.',
                      );
                    } catch (e) {
                      setFailure(errorMessage(e));
                    }
                  }}
                >
                  Duplicar treino
                </Button>
              )}
              <span className="small muted">Atualizado {formatDate(w.updatedAt)}</span>
              <Button asChild variant={studentView ? 'default' : 'outline'} size="sm">
                <Link href={studentView ? `/aluno/treinos/${w.id}` : `/personal/treinos/${w.id}`}>
                  {studentView ? 'Iniciar treino' : 'Editar treino'}
                  <ArrowUpRight size={14} />
                </Link>
              </Button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
export function WorkoutsPage() {
  const data = useDemo();
  const [query, setQuery] = useState('');
  const [student, setStudent] = useState('all');
  const workouts = data.workouts.filter(
    (w) =>
      normalize(w.title).includes(normalize(query)) &&
      (student === 'all' || w.studentId === student),
  );
  return (
    <>
      <PageHeader
        eyebrow="Prescrição de treinos"
        title="Planejar é cuidar do próximo passo."
        description="Organize exercícios, séries e descansos em treinos atribuídos a cada aluno."
        action={
          <Button asChild>
            <Link href="/personal/treinos/novo">
              <Plus size={16} />
              Criar treino
            </Link>
          </Button>
        }
      />
      <div className="toolbar mb-6 rounded-xl border bg-white">
        <div className="search-field">
          <label className="sr-only" htmlFor="workout-search">
            Buscar treino
          </label>
          <Search size={17} aria-hidden />
          <Input
            id="workout-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar treino"
          />
        </div>
        <label className="sr-only" htmlFor="workout-student">
          Filtrar por aluno
        </label>
        <select
          className="native-select"
          id="workout-student"
          value={student}
          onChange={(e) => setStudent(e.target.value)}
        >
          <option value="all">Todos os alunos</option>
          {data.students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <span className="toolbar-count" role="status">
          {workouts.length} treinos
        </span>
      </div>
      <WorkoutCards workouts={workouts} />
      <p className="form-help mt-6 flex items-center gap-2">
        <UserRound size={15} aria-hidden />
        As alterações ficam disponíveis no ambiente do aluno durante esta sessão.
      </p>
    </>
  );
}
