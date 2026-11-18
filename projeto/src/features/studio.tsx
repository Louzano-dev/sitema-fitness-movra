'use client';
import { useState } from 'react';
import { CardioEditor, CardioQuestion } from './cardio';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Layers, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useDemo, useRepository } from '@/components/providers';
import { PageHeader, Panel, Field, Feedback, EmptyState } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PageMotion, useExerciseReorder } from '@/components/motion';
import {
  EQUIPMENT,
  GOALS,
  WEEKDAYS,
  questionnaireSchema,
  type Questionnaire,
  type Program,
  type TrainingDay,
  type StudioExercise,
} from '@/domain/experience';
import { EXERCISES } from '@/domain/exercise-catalog';
import { generateProgram, RULE_VERSION, reviewReasons } from '@/domain/training-engine';
import { approveProgram, newId, saveProgram } from '@/services/experience-service';
import { errorMessage } from '@/domain/schemas';
import { normalize } from '@/domain/selectors';

const initialQuestionnaire: Questionnaire = {
  studentId: 'ana',
  age: 30,
  experience: 'Até um ano',
  level: 'Iniciante',
  goal: 'Condicionamento geral',
  frequency: 3,
  minutes: 40,
  days: ['Segunda', 'Quarta', 'Sexta'],
  location: 'Academia',
  coaching: 'Presencial',
  equipment: ['Peso corporal', 'Halteres', 'Banco', 'Polias'],
  excluded: [],
  avoidPatterns: [],
  notes: '',
  specialContext: false,
  split: 'Full body',
};
const makeDay = (): TrainingDay => ({
  id: newId(),
  name: 'Novo dia',
  weekday: 'Segunda',
  instructions: '',
  exercises: [],
});
const makeRow = (exerciseId: string): StudioExercise => ({
  id: newId(),
  exerciseId,
  sets: 2,
  reps: 10,
  rest: 60,
  notes: '',
  locked: false,
});
const exerciseName = (id: string) => EXERCISES.find((e) => e.id === id)?.name ?? id;
export function StudioPage() {
  const captureOrder = useExerciseReorder();
  const data = useDemo();
  const repository = useRepository();
  const [view, setView] = useState<'home' | 'wizard' | 'editor' | 'templates' | 'versions'>('home');
  const [step, setStep] = useState(0);
  const [q, setQ] = useState<Questionnaire>(initialQuestionnaire);
  const [draft, setDraft] = useState<Program | null>(null);
  const [undo, setUndo] = useState<Program[]>([]);
  const [dayIndex, setDayIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [pending, setPending] = useState<Program | null>(null);
  const [preview, setPreview] = useState(false);
  const [generation, setGeneration] = useState(0);
  const change = <K extends keyof Questionnaire>(key: K, value: Questionnaire[K]) =>
    setQ((current) => ({ ...current, [key]: value }));
  const act = (action: () => void) => {
    setError('');
    setFeedback('');
    try {
      action();
    } catch (error) {
      setError(errorMessage(error));
    }
  };
  function open(program: Program) {
    setDraft(structuredClone(program));
    setUndo([]);
    setDayIndex(0);
    setReviewed(false);
    setView('editor');
    setError('');
    setFeedback('');
  }
  function edit(program: Program) {
    if (draft) setUndo((previous) => [...previous.slice(-19), structuredClone(draft)]);
    setDraft({ ...program, status: 'Rascunho', approvedVersion: undefined, approvedAt: undefined });
    setReviewed(false);
    setFeedback('Alterações em rascunho. Salve e revise novamente antes de atribuir.');
  }
  function editDay(update: (day: TrainingDay) => TrainingDay) {
    if (!draft) return;
    const nextDay = update(draft.days[dayIndex]);
    if (
      nextDay.exercises.map((e) => e.id).join() !==
      draft.days[dayIndex].exercises.map((e) => e.id).join()
    )
      captureOrder(nextDay.exercises.map((e) => e.id));
    edit({
      ...draft,
      days: draft.days.map((day, index) => (index === dayIndex ? nextDay : day)),
    });
  }
  function editRow(id: string, patch: Partial<StudioExercise>) {
    editDay((day) => ({
      ...day,
      exercises: day.exercises.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  }
  function blank(supervised = false) {
    open({
      id: '',
      title: supervised ? 'Planejamento supervisionado' : 'Minha nova ficha',
      studentId: q.studentId,
      questionnaire: supervised ? q : undefined,
      ruleVersion: RULE_VERSION,
      status: 'Rascunho',
      days: [makeDay()],
      rationale: ['Ficha elaborada manualmente pelo profissional.'],
      revision: 1,
      updatedAt: '',
      template: false,
      supervised,
    });
  }
  function generate() {
    act(() => {
      const parsed = questionnaireSchema.parse(q);
      repository.updateExperience((state) => ({
        ...state,
        ages: { ...state.ages, [q.studentId]: q.age },
      }));
      const result = generateProgram(parsed);
      if (result.kind === 'review') {
        setError(result.reasons.join(' '));
        return;
      }
      open(saveProgram(repository, result.program));
      setFeedback('Proposta por regras gerada como rascunho. Revise todos os parâmetros.');
    });
  }
  function persist(template = false) {
    if (!draft) return null;
    const saved = saveProgram(repository, { ...draft, template: template || draft.template });
    setDraft(saved);
    setReviewed(false);
    setFeedback(template ? 'Modelo salvo localmente.' : 'Rascunho salvo neste navegador.');
    return saved;
  }
  function regenerate(whole = false) {
    if (!draft?.questionnaire) {
      setError(
        'Esta ficha manual não possui questionário. Use a biblioteca para adicionar exercícios.',
      );
      return;
    }
    act(() => {
      const result = generateProgram(draft.questionnaire!, generation + 1);
      if (result.kind === 'review') throw new Error(result.reasons.join(' '));
      setGeneration(generation + 1);
      const replace = (day: TrainingDay, index: number) => {
        const generated = result.program.days[index % result.program.days.length];
        const locked = day.exercises.filter((row) => row.locked);
        return {
          ...day,
          exercises: [
            ...locked,
            ...generated.exercises
              .filter((row) => !locked.some((item) => item.exerciseId === row.exerciseId))
              .map((row) => ({ ...row, id: newId() })),
          ].slice(0, 20),
        };
      };
      setPending({
        ...draft,
        days: draft.days.map((day, index) =>
          whole || index === dayIndex ? replace(day, index) : day,
        ),
      });
    });
  }
  const currentDay = draft?.days[dayIndex];
  return (
    <>
      <PageHeader
        eyebrow="MOVRA Studio · treinamento"
        title="Um plano. Muitas possibilidades."
        description="Propostas por regras, revisão profissional e fichas versionadas. Dados fictícios locais; sem IA ou prescrição clínica automática."
        action={
          <Button
            variant="outline"
            onClick={() => {
              setView('home');
              setError('');
            }}
          >
            Minhas fichas
          </Button>
        }
      />
      <div className="module-hero">
        <Layers size={30} aria-hidden />
        <div>
          <p className="eyebrow">Planejar → revisar → acompanhar</p>
          <h2>Seu critério profissional, no centro.</h2>
          <p>O Studio organiza uma proposta. Você decide o que faz sentido para cada pessoa.</p>
        </div>
        <span className="tag">Regras v1.0</span>
      </div>
      <Feedback error={error} success={feedback} />
      <div className="module-nav" aria-label="Áreas do Studio">
        <Button
          variant="outline"
          onClick={() => {
            setStep(0);
            setView('wizard');
            setError('');
          }}
        >
          Gerar treino personalizado
        </Button>
        <Button variant="outline" onClick={() => blank()}>
          Criar treino do zero
        </Button>
        <Button variant="outline" onClick={() => setView('templates')}>
          Explorar modelos
        </Button>
        <Button variant="outline" onClick={() => setView('versions')}>
          Histórico de versões
        </Button>
      </div>
      {view === 'wizard' && (
        <Panel className="module-panel">
          <PageMotion focusPage={false} route={`questionnaire-${step}`}>
            <p className="eyebrow">Etapa {step + 1} de 6</p>
            <h2>
              {
                [
                  'Identificação',
                  'Objetivo',
                  'Disponibilidade',
                  'Equipamentos',
                  'Considerações individuais',
                  'Revisão das respostas',
                ][step]
              }
            </h2>
            <ol className="wizard-progress" aria-label="Etapas">
              {['Identificação', 'Objetivo', 'Dias', 'Equipamentos', 'Contexto', 'Revisão'].map(
                (name, index) => (
                  <li key={name}>
                    <button
                      type="button"
                      aria-current={step === index ? 'step' : undefined}
                      aria-label={`Etapa ${index + 1}: ${name}`}
                      onClick={() => setStep(index)}
                    >
                      {index + 1}
                      <span>{name}</span>
                    </button>
                  </li>
                ),
              )}
            </ol>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (step < 5) setStep(step + 1);
                else generate();
              }}
              className="form-stack"
            >
              {step === 0 && (
                <div className="form-grid">
                  <Field label="Aluno" htmlFor="studio-student">
                    <select
                      id="studio-student"
                      className="native-select"
                      value={q.studentId}
                      onChange={(e) =>
                        setQ({
                          ...q,
                          studentId: e.target.value,
                          age: data.experience.ages[e.target.value] ?? 30,
                        })
                      }
                    >
                      {data.students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Idade fictícia" htmlFor="studio-age">
                    <Input
                      id="studio-age"
                      type="number"
                      min={5}
                      max={100}
                      required
                      value={q.age}
                      onChange={(e) => change('age', Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Experiência anterior" htmlFor="studio-experience">
                    <select
                      id="studio-experience"
                      className="native-select"
                      value={q.experience}
                      onChange={(e) =>
                        change('experience', e.target.value as Questionnaire['experience'])
                      }
                    >
                      {['Sem experiência', 'Até um ano', 'Mais de um ano'].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Nível atual" htmlFor="studio-level">
                    <select
                      id="studio-level"
                      className="native-select"
                      value={q.level}
                      onChange={(e) => change('level', e.target.value as Questionnaire['level'])}
                    >
                      {['Iniciante', 'Intermediário', 'Avançado'].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </Field>
                  <p className="form-help">
                    Idade não determina experiência. Preencha somente dados fictícios.
                  </p>
                </div>
              )}
              {step === 1 && (
                <>
                  <Field label="Objetivo" htmlFor="studio-goal">
                    <select
                      id="studio-goal"
                      className="native-select"
                      value={q.goal}
                      onChange={(e) => change('goal', e.target.value as Questionnaire['goal'])}
                    >
                      {GOALS.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Divisão da proposta" htmlFor="studio-split">
                    <select
                      id="studio-split"
                      className="native-select"
                      value={q.split}
                      onChange={(e) => change('split', e.target.value as Questionnaire['split'])}
                    >
                      {[
                        'Full body',
                        'A/B',
                        'A/B/C',
                        'Superior/inferior',
                        'Padrões de movimento',
                      ].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
              {step === 2 && (
                <>
                  <div className="form-grid">
                    <Field label="Dias por semana" htmlFor="studio-frequency">
                      <select
                        id="studio-frequency"
                        className="native-select"
                        value={q.frequency}
                        onChange={(e) => change('frequency', Number(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Tempo por sessão (min)" htmlFor="studio-minutes">
                      <Input
                        id="studio-minutes"
                        type="number"
                        min={15}
                        max={120}
                        required
                        value={q.minutes}
                        onChange={(e) => change('minutes', Number(e.target.value))}
                      />
                    </Field>
                    <Field label="Local" htmlFor="studio-location">
                      <select
                        id="studio-location"
                        className="native-select"
                        value={q.location}
                        onChange={(e) =>
                          change('location', e.target.value as Questionnaire['location'])
                        }
                      >
                        {['Academia', 'Casa', 'Estúdio'].map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Acompanhamento" htmlFor="studio-coaching">
                      <select
                        id="studio-coaching"
                        className="native-select"
                        value={q.coaching}
                        onChange={(e) =>
                          change('coaching', e.target.value as Questionnaire['coaching'])
                        }
                      >
                        <option>Presencial</option>
                        <option>Online</option>
                      </select>
                    </Field>
                  </div>
                  <fieldset>
                    <legend>Dias disponíveis · selecione {q.frequency}</legend>
                    <div className="choice-grid">
                      {WEEKDAYS.map((day) => (
                        <label key={day} className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={q.days.includes(day)}
                            onChange={(e) =>
                              change(
                                'days',
                                e.target.checked
                                  ? [...q.days, day]
                                  : q.days.filter((item) => item !== day),
                              )
                            }
                          />
                          {day}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </>
              )}
              {step === 3 && (
                <fieldset>
                  <legend>Equipamentos disponíveis</legend>
                  <div className="choice-grid">
                    {EQUIPMENT.map((item) => (
                      <label key={item} className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={q.equipment.includes(item)}
                          onChange={(e) =>
                            change(
                              'equipment',
                              e.target.checked
                                ? [...q.equipment, item]
                                : q.equipment.filter((value) => value !== item),
                            )
                          }
                        />
                        {item}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {step === 4 && (
                <>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={q.specialContext}
                      onChange={(e) => change('specialContext', e.target.checked)}
                    />
                    Contexto especial, dor relevante ou condição que exige avaliação individual
                  </label>
                  <p className="form-help">
                    Não descreva diagnósticos reais. Menores de 18 anos seguem planejamento manual
                    supervisionado.
                  </p>
                  <Field
                    label="Preferências, dificuldades e observações fictícias"
                    htmlFor="studio-notes"
                  >
                    <Textarea
                      id="studio-notes"
                      maxLength={1000}
                      value={q.notes}
                      onChange={(e) => change('notes', e.target.value)}
                    />
                  </Field>
                  <fieldset>
                    <legend>Padrões que deseja evitar</legend>
                    <div className="choice-grid">
                      {[...new Set(EXERCISES.map((e) => e.pattern))].map((pattern) => (
                        <label key={pattern} className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={q.avoidPatterns.includes(pattern)}
                            onChange={(e) =>
                              change(
                                'avoidPatterns',
                                e.target.checked
                                  ? [...q.avoidPatterns, pattern]
                                  : q.avoidPatterns.filter((item) => item !== pattern),
                              )
                            }
                          />
                          {pattern}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Field label="Excluir exercícios (seleção múltipla)" htmlFor="studio-excluded">
                    <select
                      id="studio-excluded"
                      multiple
                      className="native-select multi-select"
                      value={q.excluded}
                      onChange={(e) =>
                        change(
                          'excluded',
                          [...e.target.selectedOptions].map((option) => option.value),
                        )
                      }
                    >
                      {EXERCISES.map((exercise) => (
                        <option key={exercise.id} value={exercise.id}>
                          {exercise.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
              {step === 5 && (
                <>
                  <CardioQuestion value={q.cardio} onChange={(value) => change('cardio', value)} />
                  <dl className="review-grid">
                    <div>
                      <dt>Aluno / idade</dt>
                      <dd>
                        {data.students.find((s) => s.id === q.studentId)?.name} · {q.age} anos
                      </dd>
                    </div>
                    <div>
                      <dt>Nível / experiência</dt>
                      <dd>
                        {q.level} · {q.experience}
                      </dd>
                    </div>
                    <div>
                      <dt>Objetivo / divisão</dt>
                      <dd>
                        {q.goal} · {q.split}
                      </dd>
                    </div>
                    <div>
                      <dt>Disponibilidade</dt>
                      <dd>
                        {q.frequency} dias · {q.minutes} min · {q.days.join(', ')}
                      </dd>
                    </div>
                    <div>
                      <dt>Equipamentos</dt>
                      <dd>{q.equipment.join(', ') || 'Nenhum selecionado'}</dd>
                    </div>
                    <div>
                      <dt>Exclusões</dt>
                      <dd>{q.excluded.map(exerciseName).join(', ') || 'Nenhuma'}</dd>
                    </div>
                    <div>
                      <dt>Observações</dt>
                      <dd>{q.notes || 'Sem observações'}</dd>
                    </div>
                  </dl>
                  {reviewReasons(q).length > 0 && (
                    <div className="review-required" role="status">
                      <h3>Revisão individual obrigatória</h3>
                      {reviewReasons(q).map((reason) => (
                        <p key={reason}>{reason}</p>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          repository.updateExperience((state) => ({
                            ...state,
                            ages: { ...state.ages, [q.studentId]: q.age },
                          }));
                          blank(true);
                        }}
                      >
                        Abrir planejamento supervisionado
                      </Button>
                    </div>
                  )}
                  <p className="form-help">
                    Gerar não publica nem garante segurança individual. Toda ficha exige revisão e
                    aprovação do profissional.
                  </p>
                </>
              )}
              <div className="form-actions">
                <Button
                  type="button"
                  variant="outline"
                  disabled={step === 0}
                  onClick={() => setStep(step - 1)}
                >
                  <ArrowLeft size={16} />
                  Voltar etapa
                </Button>
                <Button type="submit">
                  {step < 5 ? 'Continuar' : 'Gerar proposta de treino'}
                  <ArrowRight size={16} />
                </Button>
              </div>
            </form>
          </PageMotion>
        </Panel>
      )}
      {(view === 'home' || view === 'templates') && (
        <>
          <div className="page-heading">
            <h2>{view === 'templates' ? 'Modelos salvos' : 'Minhas fichas'}</h2>
            <Link className="text-link" href="/personal/treinos">
              Abrir fichas atribuídas
            </Link>
          </div>
          <div className="workout-grid">
            {data.experience.programs
              .filter((p) => view !== 'templates' || p.template)
              .map((program) => (
                <Panel key={program.id} className="module-panel">
                  <p className="eyebrow">
                    {program.status} · revisão {program.revision}
                  </p>
                  <h2>{program.title}</h2>
                  <p>
                    {data.students.find((s) => s.id === program.studentId)?.name} ·{' '}
                    {program.days.length} dias
                  </p>
                  <div className="form-actions">
                    <Button
                      onClick={() =>
                        open(
                          view === 'templates'
                            ? {
                                ...structuredClone(program),
                                id: '',
                                title: `${program.title} · modelo`,
                                status: 'Rascunho',
                                approvedVersion: undefined,
                              }
                            : program,
                        )
                      }
                    >
                      {view === 'templates' ? 'Usar modelo' : 'Abrir ficha'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        open({
                          ...structuredClone(program),
                          id: '',
                          title: `${program.title} · cópia`,
                          status: 'Rascunho',
                          approvedVersion: undefined,
                        })
                      }
                    >
                      Duplicar
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        repository.updateExperience((state) => ({
                          ...state,
                          programs: state.programs.map((p) =>
                            p.id === program.id ? { ...p, status: 'Arquivado' } : p,
                          ),
                        }))
                      }
                    >
                      Arquivar
                    </Button>
                  </div>
                </Panel>
              ))}
          </div>
          {!data.experience.programs.some((p) => view !== 'templates' || p.template) && (
            <EmptyState
              title={
                view === 'templates'
                  ? 'Seus modelos começam aqui.'
                  : 'Sua próxima ficha começa aqui.'
              }
              description="Gere uma proposta ou crie uma ficha manual. Os modelos salvos aparecerão nesta área."
              action={
                <Button
                  onClick={() => {
                    setStep(0);
                    setView('wizard');
                  }}
                >
                  Começar pelo questionário
                </Button>
              }
            />
          )}
        </>
      )}
      {view === 'versions' && (
        <Panel className="module-panel">
          <h2>Versões aprovadas</h2>
          <p className="form-help">
            Cada aprovação preserva um retrato independente. Sessões concluídas não mudam.
          </p>
          {data.experience.versions.length ? (
            data.experience.versions.map((version) => (
              <article className="version-row" key={version.approvedVersion}>
                <div>
                  <h3>{version.title}</h3>
                  <p>{version.approvedVersion}</p>
                  <small>{version.approvedAt}</small>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    open({
                      ...structuredClone(version),
                      id: '',
                      title: `${version.title} · nova versão`,
                      status: 'Rascunho',
                      approvedVersion: undefined,
                    })
                  }
                >
                  Criar cópia editável
                </Button>
              </article>
            ))
          ) : (
            <EmptyState title="Nenhuma versão aprovada." />
          )}
        </Panel>
      )}
      {view === 'editor' && draft && currentDay && (
        <>
          <Panel className="module-panel">
            <div className="form-grid">
              <Field label="Nome da ficha" htmlFor="program-title">
                <Input
                  id="program-title"
                  maxLength={100}
                  value={draft.title}
                  onChange={(e) => edit({ ...draft, title: e.target.value })}
                />
              </Field>
              <Field label="Atribuir ao aluno" htmlFor="program-student">
                <select
                  id="program-student"
                  className="native-select"
                  value={draft.studentId}
                  onChange={(e) => edit({ ...draft, studentId: e.target.value })}
                >
                  {data.students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="form-help">
              {draft.status} · revisão {draft.revision} · {draft.approvedVersion ?? 'Sem aprovação'}
            </p>
            <details>
              <summary>Por que esta proposta?</summary>
              {draft.rationale.map((reason) => (
                <p key={reason}>{reason}</p>
              ))}
            </details>
            <div className="form-actions">
              <Button
                variant="outline"
                onClick={() =>
                  act(() => {
                    persist();
                  })
                }
              >
                Salvar rascunho
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  act(() => {
                    persist(true);
                  })
                }
              >
                Salvar como modelo
              </Button>
              <Button
                variant="outline"
                disabled={!undo.length}
                onClick={() => {
                  setDraft(undo.at(-1)!);
                  setUndo(undo.slice(0, -1));
                  setReviewed(false);
                }}
              >
                Desfazer
              </Button>
              <Button variant="outline" onClick={() => setPreview(true)}>
                Prévia do aluno
              </Button>
              <Button variant="outline" onClick={() => regenerate(true)}>
                <RefreshCw size={16} />
                Recriar proposta
              </Button>
            </div>
          </Panel>
          <div className="studio-editor">
            <aside className="panel module-panel">
              <h2>Dias de treino</h2>
              {draft.days.map((day, index) => (
                <button
                  className={`day-tab ${index === dayIndex ? 'selected' : ''}`}
                  key={day.id}
                  aria-pressed={index === dayIndex}
                  onClick={() => setDayIndex(index)}
                >
                  {day.name}
                  <span>
                    {day.weekday} · {day.exercises.length} exercícios
                  </span>
                </button>
              ))}
              <Button
                variant="outline"
                disabled={draft.days.length >= 7}
                onClick={() => {
                  edit({ ...draft, days: [...draft.days, makeDay()] });
                  setDayIndex(draft.days.length);
                }}
              >
                <Plus size={16} />
                Adicionar dia
              </Button>
            </aside>
            <Panel className="module-panel">
              <PageMotion focusPage={false} route={`editor-day-${currentDay.id}`}>
                <div className="form-grid">
                  <Field label="Nome do dia" htmlFor="day-name">
                    <Input
                      id="day-name"
                      value={currentDay.name}
                      onChange={(e) => editDay((day) => ({ ...day, name: e.target.value }))}
                    />
                  </Field>
                  <Field label="Dia da semana" htmlFor="day-weekday">
                    <select
                      id="day-weekday"
                      className="native-select"
                      value={currentDay.weekday}
                      onChange={(e) => editDay((day) => ({ ...day, weekday: e.target.value }))}
                    >
                      {WEEKDAYS.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <CardioEditor
                  items={currentDay.cardio ?? []}
                  onChange={(cardio) => editDay((day) => ({ ...day, cardio }))}
                />
                <Field label="Instruções da sessão" htmlFor="day-instructions">
                  <Textarea
                    id="day-instructions"
                    value={currentDay.instructions}
                    maxLength={1000}
                    onChange={(e) => editDay((day) => ({ ...day, instructions: e.target.value }))}
                  />
                </Field>
                <div className="form-actions">
                  <Button variant="outline" onClick={() => regenerate()}>
                    Gerar novamente este dia
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={draft.days.length === 1}
                    onClick={() => {
                      edit({ ...draft, days: draft.days.filter((_, index) => index !== dayIndex) });
                      setDayIndex(0);
                    }}
                  >
                    <Trash2 size={16} />
                    Excluir dia
                  </Button>
                </div>
                {currentDay.exercises.map((row, index) => (
                  <article className="studio-exercise" key={row.id} data-flip-id={row.id}>
                    <div className="page-heading">
                      <h3>
                        {index + 1}. {exerciseName(row.exerciseId)}
                      </h3>
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={row.locked}
                          onChange={(e) => editRow(row.id, { locked: e.target.checked })}
                        />
                        Preservar
                      </label>
                    </div>
                    <Field
                      label={`Substituir exercício ${index + 1}`}
                      htmlFor={`studio-replace-${row.id}`}
                    >
                      <select
                        id={`studio-replace-${row.id}`}
                        className="native-select"
                        value={row.exerciseId}
                        onChange={(e) => editRow(row.id, { exerciseId: e.target.value })}
                      >
                        {EXERCISES.map((exercise) => (
                          <option key={exercise.id} value={exercise.id}>
                            {exercise.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="prescription-grid">
                      <Field label="Séries" htmlFor={`studio-sets-${row.id}`}>
                        <Input
                          id={`studio-sets-${row.id}`}
                          type="number"
                          min={1}
                          max={10}
                          value={row.sets}
                          onChange={(e) => editRow(row.id, { sets: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label="Repetições iniciais" htmlFor={`studio-reps-${row.id}`}>
                        <Input
                          id={`studio-reps-${row.id}`}
                          type="number"
                          min={1}
                          max={100}
                          value={row.reps}
                          onChange={(e) => editRow(row.id, { reps: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label="Repetições finais (opcional)" htmlFor={`studio-max-${row.id}`}>
                        <Input
                          id={`studio-max-${row.id}`}
                          type="number"
                          min={row.reps}
                          max={100}
                          value={row.repsMax ?? ''}
                          onChange={(e) =>
                            editRow(row.id, {
                              repsMax: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                        />
                      </Field>
                      <Field label="Descanso (s)" htmlFor={`studio-rest-${row.id}`}>
                        <Input
                          id={`studio-rest-${row.id}`}
                          type="number"
                          min={0}
                          max={600}
                          value={row.rest}
                          onChange={(e) => editRow(row.id, { rest: Number(e.target.value) })}
                        />
                      </Field>
                      <Field
                        label="Carga orientativa (kg, opcional)"
                        htmlFor={`studio-kg-${row.id}`}
                      >
                        <Input
                          id={`studio-kg-${row.id}`}
                          type="number"
                          min={0}
                          max={1000}
                          step="any"
                          value={row.kg ?? ''}
                          onChange={(e) =>
                            editRow(row.id, {
                              kg: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Observações do exercício" htmlFor={`studio-note-${row.id}`}>
                      <Textarea
                        id={`studio-note-${row.id}`}
                        value={row.notes}
                        maxLength={500}
                        placeholder="Opcional: descreva posição, amplitude, ritmo e como deseja que o aluno execute."
                        onChange={(e) => editRow(row.id, { notes: e.target.value })}
                      />
                    </Field>
                    <div className="form-actions">
                      <Button
                        variant="ghost"
                        disabled={index === 0}
                        aria-label={`Mover item ${index + 1} para cima`}
                        onClick={() =>
                          editDay((day) => {
                            const rows = [...day.exercises];
                            [rows[index - 1], rows[index]] = [rows[index], rows[index - 1]];
                            return { ...day, exercises: rows };
                          })
                        }
                      >
                        ↑ Subir
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={index === currentDay.exercises.length - 1}
                        aria-label={`Mover item ${index + 1} para baixo`}
                        onClick={() =>
                          editDay((day) => {
                            const rows = [...day.exercises];
                            [rows[index], rows[index + 1]] = [rows[index + 1], rows[index]];
                            return { ...day, exercises: rows };
                          })
                        }
                      >
                        ↓ Descer
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={currentDay.exercises.length >= 20}
                        onClick={() =>
                          editDay((day) => ({
                            ...day,
                            exercises: [...day.exercises, { ...row, id: newId(), locked: false }],
                          }))
                        }
                      >
                        Duplicar exercício
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          editDay((day) => ({
                            ...day,
                            exercises: day.exercises.filter((item) => item.id !== row.id),
                          }))
                        }
                      >
                        Remover exercício
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          act(() => {
                            const base = EXERCISES.find((e) => e.id === row.exerciseId)!;
                            const alternate = EXERCISES.find(
                              (e) =>
                                e.id !== base.id &&
                                e.pattern === base.pattern &&
                                (!draft.questionnaire ||
                                  (e.requires.every((r) =>
                                    draft.questionnaire!.equipment.includes(
                                      r as Questionnaire['equipment'][number],
                                    ),
                                  ) &&
                                    !draft.questionnaire.excluded.includes(e.id))),
                            );
                            if (!alternate)
                              throw new Error(
                                'Sem alternativa compatível neste catálogo. Use a seleção manual após avaliação.',
                              );
                            if (row.locked)
                              throw new Error(
                                'Desmarque Preservar para substituir este exercício.',
                              );
                            setPending({
                              ...draft,
                              days: draft.days.map((day, di) =>
                                di === dayIndex
                                  ? {
                                      ...day,
                                      exercises: day.exercises.map((item) =>
                                        item.id === row.id
                                          ? { ...item, exerciseId: alternate.id }
                                          : item,
                                      ),
                                    }
                                  : day,
                              ),
                            });
                          })
                        }
                      >
                        Sugerir alternativa
                      </Button>
                    </div>
                  </article>
                ))}
                <div className="exercise-filters">
                  <Field label="Pesquisar exercício para adicionar" htmlFor="studio-search">
                    <Input
                      id="studio-search"
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </Field>
                  <Field label="Filtrar grupo" htmlFor="studio-group">
                    <select
                      id="studio-group"
                      className="native-select"
                      value={group}
                      onChange={(e) => setGroup(e.target.value)}
                    >
                      <option value="all">Todos os grupos</option>
                      {[...new Set(EXERCISES.map((e) => e.group))].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Adicionar exercício" htmlFor="studio-add">
                  <select
                    id="studio-add"
                    className="native-select"
                    value=""
                    onChange={(e) => {
                      if (e.target.value)
                        editDay((day) => ({
                          ...day,
                          exercises: [...day.exercises, makeRow(e.target.value)],
                        }));
                    }}
                    disabled={currentDay.exercises.length >= 20}
                  >
                    <option value="">Selecione na biblioteca</option>
                    {EXERCISES.filter(
                      (e) =>
                        normalize(e.name).includes(normalize(query)) &&
                        (group === 'all' || e.group === group),
                    ).map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </PageMotion>
            </Panel>
          </div>
          <Panel className="module-panel review-panel">
            <h2>Revisar antes de atribuir</h2>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={draft.supervised}
                onChange={(e) => edit({ ...draft, supervised: e.target.checked })}
              />
              Planejamento individual supervisionado, quando exigido pelo contexto
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              Revisei aluno, contexto, dias, exercícios e parâmetros desta proposta fictícia.
            </label>
            <div className="form-actions">
              <Button
                variant="outline"
                onClick={() =>
                  act(() => {
                    const saved = persist();
                    if (saved) {
                      repository.updateExperience((state) => ({
                        ...state,
                        programs: state.programs.map((p) =>
                          p.id === saved.id ? { ...p, status: 'Aguardando revisão' } : p,
                        ),
                      }));
                      setDraft({ ...saved, status: 'Aguardando revisão' });
                    }
                  })
                }
              >
                Marcar aguardando revisão
              </Button>
              <Button
                onClick={() =>
                  act(() => {
                    if (!reviewed)
                      throw new Error('Confirme a revisão profissional antes de aprovar.');
                    const saved = saveProgram(repository, draft);
                    const approved = approveProgram(repository, saved.id, true);
                    setDraft(approved);
                    setReviewed(false);
                    setFeedback(
                      `Versão aprovada: ${approved.approvedVersion}. Atribuição ainda pendente.`,
                    );
                  })
                }
              >
                <Check size={16} />
                Aprovar versão revisada
              </Button>
              <Button
                disabled={draft.status !== 'Aprovado'}
                onClick={async () => {
                  setError('');
                  try {
                    await repository.assignProgram(draft.id);
                    setDraft({ ...draft, status: 'Atribuído' });
                    setFeedback(
                      'Ficha atribuída no protótipo. Ela já aparece no painel do aluno; nenhum e-mail ou push foi enviado.',
                    );
                  } catch (error) {
                    setError(errorMessage(error));
                  }
                }}
              >
                Atribuir ficha ao aluno
              </Button>
            </div>
            <Feedback error={error} success={feedback} />
          </Panel>
        </>
      )}
      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comparar antes de substituir</DialogTitle>
            <DialogDescription>
              As suas edições só serão substituídas se você confirmar. Exercícios marcados para
              preservar são mantidos na regeneração.
            </DialogDescription>
          </DialogHeader>
          {pending && draft && (
            <div className="comparison-grid">
              <div>
                <h3>Atual</h3>
                {draft.days.map((day) => (
                  <p key={day.id}>
                    {day.name}:{' '}
                    {day.exercises.map((row) => exerciseName(row.exerciseId)).join(', ')}
                  </p>
                ))}
              </div>
              <div>
                <h3>Proposta</h3>
                {pending.days.map((day) => (
                  <p key={day.id}>
                    {day.name}:{' '}
                    {day.exercises.map((row) => exerciseName(row.exerciseId)).join(', ')}
                  </p>
                ))}
              </div>
            </div>
          )}
          <Button
            onClick={() => {
              if (pending) edit(pending);
              setPending(null);
            }}
          >
            Confirmar substituição no rascunho
          </Button>
          <Button variant="outline" onClick={() => setPending(null)}>
            Manter versão atual
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prévia da ficha do aluno</DialogTitle>
            <DialogDescription>
              {draft?.title} · proposta ainda sujeita à aprovação e atribuição.
            </DialogDescription>
          </DialogHeader>
          {draft?.days.map((day) => (
            <section key={day.id}>
              <h3>
                {day.weekday} · {day.name}
              </h3>
              <p>{day.instructions}</p>
              {day.cardio?.map((c) => (
                <p key={c.id}>
                  Cardio: {c.modality.name} · {c.position} · {c.type} · {c.intensity}
                </p>
              ))}
              <ol>
                {day.exercises.map((row) => (
                  <li key={row.id}>
                    {exerciseName(row.exerciseId)} · {row.sets} × {row.reps}
                    {row.repsMax ? `–${row.repsMax}` : ''} · {row.rest}s ·{' '}
                    {row.kg === undefined ? 'carga a orientar' : `${row.kg} kg`}
                    <p>{row.notes}</p>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </DialogContent>
      </Dialog>
    </>
  );
}
