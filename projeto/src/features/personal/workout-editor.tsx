'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDemo, useRepository } from '@/components/providers';
import { EmptyState, Feedback, Field, PageHeader, Panel } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage, workoutSchema, type WorkoutInput } from '@/domain/schemas';
import { normalize } from '@/domain/selectors';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
export function WorkoutEditor({ id, initialStudent }: { id?: string; initialStudent?: string }) {
  const data = useDemo();
  const repository = useRepository();
  const current = data.workouts.find((w) => w.id === id);
  const [savedId, setSavedId] = useState(id);
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [preview, setPreview] = useState<WorkoutInput | null>(null);
  const [publishing, setPublishing] = useState(false);
  const form = useForm<WorkoutInput>({
    resolver: zodResolver(workoutSchema),
    defaultValues: current ?? {
      studentId: initialStudent ?? '',
      title: '',
      notes: '',
      exercises: [],
    },
  });
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'exercises',
  });
  const title = useWatch({ control: form.control, name: 'title' });
  const studentId = useWatch({ control: form.control, name: 'studentId' });
  const exercises = useWatch({ control: form.control, name: 'exercises' });
  const values = { title, studentId, exercises };
  const errors = form.formState.errors;
  if (id && !current)
    return (
      <EmptyState
        title="Treino não encontrado."
        description="Ele pode ter sido criado em outra sessão da demonstração."
        action={
          <Button asChild>
            <Link href="/personal/treinos">Voltar aos treinos</Link>
          </Button>
        }
      />
    );
  return (
    <>
      <Link className="text-link" href="/personal/treinos">
        <ArrowLeft size={16} />
        Voltar aos treinos
      </Link>
      <PageHeader
        eyebrow={savedId ? 'Editar prescrição' : 'Nova prescrição'}
        title={savedId ? 'Um plano que acompanha o aluno.' : 'Dê forma ao próximo treino.'}
        description="Defina a prescrição. Os registros já concluídos pelo aluno são preservados como histórico."
      />
      <form onSubmit={form.handleSubmit((input) => setPreview(input))}>
        <Dialog
          open={preview !== null}
          onOpenChange={(open) => {
            if (!open) setPreview(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revise antes de atribuir</DialogTitle>
              <DialogDescription>
                Esta ficha será atribuída apenas na demonstração. Nenhum aluno real será notificado.
              </DialogDescription>
            </DialogHeader>
            {preview && (
              <>
                <h3>{preview.title}</h3>
                <p>{data.students.find((s) => s.id === preview.studentId)?.name}</p>
                <ol className="preview-exercises">
                  {preview.exercises.map((e) => (
                    <li key={e.exerciseId}>
                      <strong>
                        {data.exercises.find((item) => item.id === e.exerciseId)?.name}
                      </strong>
                      <span>
                        {e.sets} séries × {e.reps} repetições · {e.kg ?? 0} kg · descanso {e.rest}s
                      </span>
                    </li>
                  ))}
                </ol>
                <Button
                  type="button"
                  disabled={publishing}
                  onClick={async () => {
                    setPublishing(true);
                    setSuccess('');
                    try {
                      const result = await repository.saveWorkout(preview, savedId);
                      setSavedId(result);
                      form.reset(preview);
                      setPreview(null);
                      setSuccess(
                        'Treino atualizado nesta demonstração. Ele já está disponível para o aluno atribuído.',
                      );
                    } catch (error) {
                      form.setError('root', { message: errorMessage(error) });
                      setPreview(null);
                    } finally {
                      setPublishing(false);
                    }
                  }}
                >
                  {publishing ? 'Atribuindo…' : 'Confirmar atribuição na prévia'}
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>
        <div className="editor-layout">
          <Panel>
            <section className="editor-section">
              <h2>Contexto do treino</h2>
              {!id && (
                <div className="template-picker">
                  <Field label="Reutilizar uma ficha como modelo" htmlFor="workout-template">
                    <select
                      id="workout-template"
                      className="native-select"
                      defaultValue=""
                      onChange={(event) => {
                        const template = data.workouts.find((w) => w.id === event.target.value);
                        if (template) {
                          form.reset({
                            title: `${template.title} · modelo`,
                            studentId: values.studentId,
                            notes: template.notes,
                            exercises: structuredClone(template.exercises),
                          });
                          setSavedId(undefined);
                          setSuccess(
                            'Modelo carregado. Selecione o aluno, personalize e revise antes de atribuir.',
                          );
                        }
                      }}
                    >
                      <option value="">Começar do zero ou selecionar modelo</option>
                      {data.workouts.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.title}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
              <div className="form-stack">
                <Field label="Nome do treino" htmlFor="workout-title" error={errors.title?.message}>
                  <Input
                    id="workout-title"
                    defaultValue={current?.title ?? ''}
                    {...form.register('title')}
                    aria-invalid={!!errors.title}
                    aria-describedby={errors.title ? 'workout-title-error' : undefined}
                    placeholder="Ex.: A · Força e base"
                  />
                </Field>
                <Field label="Aluno" htmlFor="workout-owner" error={errors.studentId?.message}>
                  <select
                    className="native-select"
                    id="workout-owner"
                    defaultValue={current?.studentId ?? initialStudent ?? ''}
                    {...form.register('studentId')}
                    aria-invalid={!!errors.studentId}
                  >
                    <option value="">Selecione um aluno</option>
                    {data.students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Orientações do personal"
                  htmlFor="workout-notes"
                  error={errors.notes?.message}
                >
                  <Textarea
                    id="workout-notes"
                    defaultValue={current?.notes ?? ''}
                    {...form.register('notes')}
                    placeholder="Contexto e orientações para o aluno."
                  />
                </Field>
              </div>
            </section>
            <section className="editor-section">
              <h2>Sequência de exercícios</h2>
              {fields.map((field, index) => (
                <div className="exercise-editor" key={field.id}>
                  <div className="exercise-editor-heading">
                    <h3>
                      {String(index + 1).padStart(2, '0')} ·{' '}
                      {
                        data.exercises.find((e) => e.id === values.exercises[index]?.exerciseId)
                          ?.name
                      }
                    </h3>
                    <div className="exercise-editor-actions">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => move(index, index - 1)}
                        disabled={index === 0}
                        aria-label={`Mover exercício ${index + 1} para cima`}
                      >
                        <ArrowUp size={14} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => move(index, index + 1)}
                        disabled={index === fields.length - 1}
                        aria-label={`Mover exercício ${index + 1} para baixo`}
                      >
                        <ArrowDown size={14} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        aria-label={`Remover exercício ${index + 1}`}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <div className="prescription-grid">
                    <Field
                      label="Séries"
                      htmlFor={`sets-${index}`}
                      error={errors.exercises?.[index]?.sets?.message}
                    >
                      <Input
                        id={`sets-${index}`}
                        defaultValue={field.sets}
                        type="number"
                        min={1}
                        max={10}
                        {...form.register(`exercises.${index}.sets`, { valueAsNumber: true })}
                      />
                    </Field>
                    <Field
                      label="Repetições"
                      htmlFor={`reps-${index}`}
                      error={errors.exercises?.[index]?.reps?.message}
                    >
                      <Input
                        id={`reps-${index}`}
                        defaultValue={field.reps}
                        type="number"
                        min={1}
                        max={100}
                        {...form.register(`exercises.${index}.reps`, { valueAsNumber: true })}
                      />
                    </Field>
                    <Field
                      label="Carga (kg)"
                      htmlFor={`load-${index}`}
                      error={errors.exercises?.[index]?.kg?.message}
                    >
                      <Input
                        id={`load-${index}`}
                        type="number"
                        min={0}
                        max={1000}
                        step="any"
                        defaultValue={field.kg ?? 0}
                        {...form.register(`exercises.${index}.kg`, { valueAsNumber: true })}
                      />
                    </Field>
                    <Field
                      label="Descanso (s)"
                      htmlFor={`rest-${index}`}
                      error={errors.exercises?.[index]?.rest?.message}
                    >
                      <Input
                        id={`rest-${index}`}
                        defaultValue={field.rest}
                        type="number"
                        min={0}
                        max={600}
                        {...form.register(`exercises.${index}.rest`, { valueAsNumber: true })}
                      />
                    </Field>
                  </div>
                </div>
              ))}
              {!fields.length && (
                <p className="form-help mb-5">
                  Selecione o primeiro exercício da biblioteca abaixo.
                </p>
              )}
              <div className="exercise-filters">
                <Field label="Pesquisar exercícios" htmlFor="editor-exercise-query">
                  <Input
                    id="editor-exercise-query"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nome do exercício"
                  />
                </Field>
                <Field label="Grupo muscular" htmlFor="editor-exercise-group">
                  <select
                    className="native-select"
                    id="editor-exercise-group"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                  >
                    <option value="all">Todos os grupos</option>
                    {[...new Set(data.exercises.map((e) => e.group))].map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Adicionar exercício da biblioteca" htmlFor="add-exercise">
                <select
                  className="native-select"
                  id="add-exercise"
                  value=""
                  onChange={(event) => {
                    if (event.target.value)
                      append({
                        exerciseId: event.target.value,
                        sets: 3,
                        reps: 12,
                        rest: 60,
                        kg: 0,
                      });
                  }}
                >
                  <option value="">Selecione um exercício</option>
                  {data.exercises
                    .filter(
                      (e) =>
                        !values.exercises?.some((p) => p.exerciseId === e.id) &&
                        normalize(e.name).includes(normalize(query)) &&
                        (group === 'all' || e.group === group),
                    )
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} · {e.equipment}
                      </option>
                    ))}
                </select>
              </Field>
              <Feedback error={errors.exercises?.message ?? errors.exercises?.root?.message} />
            </section>
          </Panel>
          <div>
            <aside className="editor-summary">
              <p className="eyebrow">Uma visão do plano</p>
              <h2>{values.title || 'Seu novo treino'}</h2>
              <p>
                {data.students.find((s) => s.id === values.studentId)?.name ??
                  'Selecione o aluno para este acompanhamento.'}
              </p>
              <dl>
                <div>
                  <dt>Exercícios</dt>
                  <dd>{fields.length}</dd>
                </div>
                <div>
                  <dt>Séries</dt>
                  <dd>{values.exercises?.reduce((sum, p) => sum + (Number(p.sets) || 0), 0)}</dd>
                </div>
              </dl>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <Plus size={16} />
                Revisar treino antes de atribuir
              </Button>
              <p className="mt-4">
                Salvar substitui a prescrição e reinicia um rascunho de execução em aberto desse
                treino. Sessões já concluídas não mudam.
              </p>
            </aside>
            <Feedback error={errors.root?.message} success={success} />
          </div>
        </div>
      </form>
    </>
  );
}
