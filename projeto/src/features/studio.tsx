'use client';
import { GuideHint, useGuide } from '@/components/guided-mode';
import { useMemo, useRef, useState } from 'react';
import { CardioEditor, CardioQuestion } from './cardio';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Plus, RefreshCw, Trash2 } from 'lucide-react';
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
  SPLITS,
  DAY_FOCUS,
  questionnaireSchema,
  type Questionnaire,
  type Program,
  type TrainingDay,
  type StudioExercise,
} from '@/domain/experience';
import { StudioLibrary } from './studio-library';
import { WorkoutOutline } from '@/components/workout-outline';
import { deliverDay } from '@/domain/workout-delivery';
import { estimateDay, weekVolume, muscleFor, movements } from '@/domain/training-plan';
import { studioCatalog } from '@/domain/exercise-catalog';
import {
  generateProgram,
  regenerateDays,
  RULE_VERSION,
  reviewReasons,
} from '@/domain/training-engine';
import { approveProgram, newId, saveProgram } from '@/services/experience-service';
import { errorMessage } from '@/domain/schemas';

const initialQuestionnaire: Omit<Questionnaire, 'age'> = {
  studentId: 'ana',
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
const weeklyModels: Pick<Questionnaire, 'level' | 'split' | 'days' | 'minutes'>[] = [
  { level: 'Iniciante', split: 'Full body', days: ['Segunda', 'Quarta', 'Sexta'], minutes: 45 },
  { level: 'Intermediário', split: 'A/B/C', days: ['Segunda', 'Quarta', 'Sexta'], minutes: 60 },
  {
    level: 'Avançado',
    split: 'Upper/Lower',
    days: ['Segunda', 'Terça', 'Quinta', 'Sexta'],
    minutes: 60,
  },
];
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
export function StudioPage({ reviewQueue = false }: { reviewQueue?: boolean }) {
  const [onlyReview, setOnlyReview] = useState(reviewQueue);
  const { enabled: guided } = useGuide();
  const stepTitle = useRef<HTMLHeadingElement>(null);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    accept: () => void;
  } | null>(null);
  const captureOrder = useExerciseReorder();
  const data = useDemo();
  const repository = useRepository();
  const [view, setView] = useState<'home' | 'wizard' | 'editor' | 'templates' | 'versions'>('home');
  const [step, setStep] = useState(0);
  const [q, setQ] = useState<Questionnaire>(() => ({
    ...initialQuestionnaire,
    age: data.experience.ages[initialQuestionnaire.studentId] ?? NaN,
  }));
  const [draft, setDraft] = useState<Program | null>(null);
  const [undo, setUndo] = useState<Program[]>([]);
  const [dayIndex, setDayIndex] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [revising, setRevising] = useState(false);
  const libraryButton = useRef<HTMLButtonElement>(null);
  const catalog = useMemo(() => studioCatalog(data.exercises), [data.exercises]);
  const volume = useMemo(() => weekVolume(draft?.days ?? [], catalog), [draft?.days, catalog]);
  const exerciseName = (id: string) => catalog.find((e) => e.id === id)?.name ?? id;
  const context = { history: data.sessions, favorites: data.experience.exerciseFavorites };
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
  function goStep(next: number) {
    setError('');
    setStep(next);
    requestAnimationFrame(() => stepTitle.current?.focus());
  }
  function leaveEditor(action: () => void) {
    const saved = data.experience.programs.find((program) => program.id === draft?.id);
    if (view === 'editor' && draft && JSON.stringify(saved) !== JSON.stringify(draft)) {
      setConfirmation({
        title: 'Sair da ficha em edição?',
        description: 'Volte ao editor para salvar suas alterações ou continue sem salvar.',
        accept: action,
      });
    } else action();
  }
  function open(program: Program) {
    setRevising(false);
    if (program.questionnaire) setQ(structuredClone(program.questionnaire));
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
      const parsed = questionnaireSchema.parse(
        q.split === 'Personalizada'
          ? {
              ...q,
              dayFocus: Object.fromEntries(
                q.days.map((d) => [d, q.dayFocus?.[d] ?? 'Corpo inteiro']),
              ),
            }
          : q,
      );
      repository.updateExperience((state) => ({
        ...state,
        ages: { ...state.ages, [q.studentId]: q.age },
      }));
      const result = generateProgram(parsed, 0, context);
      if (result.kind === 'review') {
        setError(result.reasons.join(' '));
        return;
      }
      if (
        revising &&
        draft &&
        JSON.stringify(draft) !==
          JSON.stringify(data.experience.programs.find((p) => p.id === draft.id))
      )
        saveProgram(repository, draft);
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
      setPending(
        regenerateDays(draft, whole ? undefined : draft.days[dayIndex].id, generation + 1, context),
      );
      setGeneration(generation + 1);
    });
  }
  const visiblePrograms = data.experience.programs.filter((program) =>
    view === 'templates'
      ? program.template
      : !onlyReview || program.status === 'Aguardando revisão',
  );
  const currentDay = draft?.days[dayIndex];
  return (
    <>
      <PageHeader
        eyebrow={
          view === 'wizard'
            ? '1 · Para quem é o treino?'
            : view === 'editor'
              ? '2 · Montar a proposta'
              : 'MOVRA Studio · Treinamento'
        }
        title={
          {
            home: 'Criar e editar treinos',
            wizard: 'Gerar uma proposta de treino',
            editor: 'Editar ficha de treino',
            templates: 'Escolher um modelo',
            versions: 'Histórico de versões',
          }[view]
        }
        description="Escolha como preparar a ficha. Você pode revisar a proposta antes de atribuí-la ao aluno."
        action={
          view !== 'home' && (
            <Button
              variant="outline"
              onClick={() => {
                leaveEditor(() => {
                  setView('home');
                  setError('');
                  requestAnimationFrame(() =>
                    document.getElementById('studio-list-title')?.focus(),
                  );
                });
              }}
            >
              Minhas fichas
            </Button>
          )
        }
      />
      <GuideHint topic={'studio-' + view}>
        {view === 'wizard'
          ? 'Responda a uma etapa por vez. Use Voltar etapa para ajustar uma resposta antes de gerar a proposta.'
          : view === 'editor'
            ? 'Escolha o dia, ajuste os exercícios e use Visualizar como o aluno. Depois de salvar, revise e aprove a versão para atribuí-la.'
            : 'Comece pelo questionário, por uma ficha em branco ou por um modelo salvo.'}
      </GuideHint>
      <Feedback error={error} success={feedback} />
      {view === 'home' && !onlyReview && (
        <div className="planning-entry">
          <div className="studio-launch">
            <button
              aria-label="Criar treino"
              aria-describedby="create-purpose"
              aria-expanded={createOpen}
              onClick={() => setCreateOpen(!createOpen)}
            >
              <strong>
                Criar treino <Plus size={18} />
              </strong>
              <span id="create-purpose">Preparar uma ficha para um aluno.</span>
            </button>
            <button
              onClick={() => {
                setCreateOpen(false);
                document.getElementById('studio-list-title')?.focus();
              }}
            >
              <strong>
                Minhas fichas <ArrowRight size={18} />
              </strong>
              <span>Abrir um rascunho ou uma versão salva.</span>
            </button>
          </div>
          {createOpen && (
            <div className="form-actions">
              <Button
                onClick={() => {
                  setStep(0);
                  setView('wizard');
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
            </div>
          )}
        </div>
      )}
      <details className="studio-tools" open={!guided}>
        <summary>Outras ferramentas do Studio</summary>
        <div className="module-nav">
          {view !== 'home' && (
            <Button
              variant="outline"
              onClick={() =>
                leaveEditor(() => {
                  setStep(0);
                  setView('wizard');
                })
              }
            >
              Gerar treino personalizado
            </Button>
          )}
          {view !== 'home' && (
            <Button variant="outline" onClick={() => leaveEditor(() => blank())}>
              Criar treino do zero
            </Button>
          )}
          {view !== 'home' && (
            <Button variant="outline" onClick={() => leaveEditor(() => setView('templates'))}>
              Explorar modelos
            </Button>
          )}
          <Button variant="outline" onClick={() => leaveEditor(() => setView('versions'))}>
            Histórico de versões
          </Button>
        </div>
      </details>
      {view === 'wizard' && (
        <Panel className="module-panel">
          <PageMotion focusPage={false} route={`questionnaire-${step}`}>
            {revising && draft && (
              <Button variant="outline" onClick={() => setView('editor')}>
                Voltar à ficha em edição
              </Button>
            )}
            <p className="eyebrow">Etapa {step + 1} de 6</p>
            <h2 ref={stepTitle} tabIndex={-1}>
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
            <progress
              className="studio-progress"
              aria-label="Progresso do questionário"
              max={6}
              value={step + 1}
            />
            <ol className="wizard-progress" aria-label="Etapas">
              {['Identificação', 'Objetivo', 'Dias', 'Equipamentos', 'Contexto', 'Revisão'].map(
                (name, index) => (
                  <li key={name}>
                    <button
                      type="button"
                      aria-current={step === index ? 'step' : undefined}
                      aria-label={`Etapa ${index + 1}: ${name}`}
                      onClick={() => goStep(index)}
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
                if (step === 2 && q.days.length !== q.frequency) {
                  setError(
                    `Selecione ${q.frequency} dias da semana. Você marcou ${q.days.length}.`,
                  );
                  document.getElementById('studio-days')?.focus();
                  return;
                }
                if (step < 5) goStep(step + 1);
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
                          age: data.experience.ages[e.target.value] ?? NaN,
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
                      value={Number.isFinite(q.age) ? q.age : ''}
                      onChange={(e) => change('age', e.target.valueAsNumber)}
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
                  {guided && (
                    <p className="form-help">
                      A divisão organiza os exercícios entre os dias. Full body significa trabalhar
                      o corpo todo em cada sessão.
                    </p>
                  )}
                  <details className="studio-advanced">
                    <summary>Prioridade muscular opcional</summary>
                    <Field label="Grupo prioritário" htmlFor="priority-muscle">
                      <select
                        id="priority-muscle"
                        className="native-select"
                        value={q.priority ?? ''}
                        onChange={(e) => change('priority', e.target.value)}
                      >
                        <option value="">Distribuir o volume</option>
                        {[...new Set(movements.map((e) => muscleFor(e.id)))].map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </Field>
                  </details>
                  <Field label="Divisão da proposta" htmlFor="studio-split">
                    <select
                      id="studio-split"
                      className="native-select"
                      value={q.split}
                      onChange={(e) => change('split', e.target.value as Questionnaire['split'])}
                    >
                      {SPLITS.map((value) => (
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
                    <legend
                      id="studio-days"
                      tabIndex={-1}
                      aria-describedby={error ? 'studio-days-error' : undefined}
                    >
                      Dias disponíveis · selecione {q.frequency}
                    </legend>
                    {error && (
                      <p id="studio-days-error" className="field-error">
                        {error}
                      </p>
                    )}
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
                  {q.split === 'Personalizada' &&
                    WEEKDAYS.filter((d) => q.days.includes(d)).map((d) => (
                      <Field key={d} label={'Foco de ' + d} htmlFor={'focus-' + d}>
                        <select
                          className="native-select"
                          id={'focus-' + d}
                          value={q.dayFocus?.[d] ?? 'Corpo inteiro'}
                          onChange={(e) =>
                            change('dayFocus', {
                              ...q.dayFocus,
                              [d]: e.target.value as (typeof DAY_FOCUS)[number],
                            })
                          }
                        >
                          {DAY_FOCUS.map((f) => (
                            <option key={f}>{f}</option>
                          ))}
                        </select>
                      </Field>
                    ))}
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
                      {[...new Set(catalog.map((e) => e.pattern))].map((pattern) => (
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
                      {catalog.map((exercise) => (
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
                  {error && !reviewReasons(q).length && (
                    <div className="form-actions">
                      <Button type="button" variant="outline" onClick={() => goStep(2)}>
                        Ajustar disponibilidade
                      </Button>
                      <Button type="button" variant="outline" onClick={() => blank(true)}>
                        Montar ficha manual
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
                  onClick={() => goStep(step - 1)}
                >
                  <ArrowLeft size={16} />
                  Voltar etapa
                </Button>
                <Button type="submit">
                  {step < 5
                    ? 'Continuar'
                    : revising
                      ? 'Salvar ficha atual e gerar nova proposta'
                      : 'Gerar proposta de treino'}
                  <ArrowRight size={16} />
                </Button>
              </div>
            </form>
          </PageMotion>
        </Panel>
      )}
      {view === 'templates' && (
        <Panel className="module-panel">
          <h2>Modelos de semana</h2>
          <p className="form-help">
            Escolha uma divisão. O Studio ajusta os exercícios após você conferir o aluno, os
            equipamentos e o tempo disponível.
          </p>
          <div className="form-actions">
            {weeklyModels.map((model) => (
              <Button
                key={model.level}
                variant="outline"
                onClick={() => {
                  setRevising(false);
                  setQ((current) => ({
                    ...current,
                    ...model,
                    frequency: model.days.length,
                    dayFocus: undefined,
                  }));
                  setError('');
                  setFeedback('');
                  setView('wizard');
                  goStep(0);
                }}
              >
                {model.level} · {model.split} · {model.days.length} dias
              </Button>
            ))}
          </div>
        </Panel>
      )}
      {(view === 'home' || view === 'templates') && (
        <>
          <div className="page-heading">
            <h2 id="studio-list-title" tabIndex={-1}>
              {view === 'templates' ? 'Modelos salvos' : 'Minhas fichas'}
            </h2>
            <Link className="text-link" href="/personal/treinos">
              Abrir fichas atribuídas
            </Link>
          </div>
          {view === 'home' && (
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={onlyReview}
                onChange={(event) => setOnlyReview(event.currentTarget.checked)}
              />{' '}
              Somente fichas aguardando revisão
            </label>
          )}
          <div className="workout-grid">
            {visiblePrograms.map((program) => (
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
                    disabled={program.status === 'Arquivado'}
                    onClick={() =>
                      setConfirmation({
                        title: 'Arquivar esta ficha?',
                        description:
                          program.title +
                          ' ficará marcada como arquivada. As sessões já registradas serão preservadas.',
                        accept: () => {
                          repository.updateExperience((state) => ({
                            ...state,
                            programs: state.programs.map((p) =>
                              p.id === program.id ? { ...p, status: 'Arquivado' } : p,
                            ),
                          }));
                          setFeedback('Ficha arquivada neste navegador.');
                        },
                      })
                    }
                  >
                    Arquivar
                  </Button>
                </div>
              </Panel>
            ))}
          </div>
          {!visiblePrograms.length && (
            <EmptyState
              title={
                view === 'templates'
                  ? 'Seus modelos começam aqui.'
                  : onlyReview
                    ? 'Nenhuma ficha aguarda revisão.'
                    : 'Sua próxima ficha começa aqui.'
              }
              description={
                onlyReview && view === 'home'
                  ? 'Desmarque o filtro para consultar todas as fichas.'
                  : 'Gere uma proposta ou crie uma ficha manual. Os modelos salvos aparecerão nesta área.'
              }
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
            {guided && (
              <nav aria-label="Passos da edição" className="editor-steps">
                {[
                  ['program-student', '1. Escolher aluno'],
                  ['day-name', '2. Editar dia e exercícios'],
                  ['studio-review', '3. Revisar e atribuir'],
                ].map(([target, label]) => (
                  <Button
                    key={target}
                    variant="outline"
                    onClick={() => document.getElementById(target)?.focus()}
                  >
                    {label}
                  </Button>
                ))}
              </nav>
            )}
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
                Visualizar como o aluno
              </Button>
              {draft.questionnaire && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setRevising(true);
                    setStep(0);
                    setQ(structuredClone(draft.questionnaire!));
                    setView('wizard');
                  }}
                >
                  Rever respostas
                </Button>
              )}
              <Button variant="outline" onClick={() => regenerate(true)}>
                <RefreshCw size={16} />
                Recriar proposta
              </Button>
            </div>
          </Panel>
          <div className="studio-editor">
            <aside className="panel module-panel">
              <h2>Semana de treino</h2>
              {draft.days.map((day, index) => (
                <button
                  className={`day-tab ${index === dayIndex ? 'selected' : ''}`}
                  key={day.id}
                  aria-pressed={index === dayIndex}
                  onClick={() => setDayIndex(index)}
                >
                  {day.name}
                  <span>
                    {day.weekday} · {day.exercises.length} exercícios · {estimateDay(day).sets}{' '}
                    séries · ≈ {estimateDay(day).minutes} min
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
              <details className="studio-advanced">
                <summary>Volume e cobertura semanal</summary>
                {Object.entries(volume).map(([muscle, sets]) => (
                  <p key={muscle}>
                    {muscle} · {sets} séries diretas
                  </p>
                ))}
                <p>
                  Grupos sem séries diretas:{' '}
                  {[...new Set(movements.map((e) => muscleFor(e.id)))]
                    .filter((m) => m !== 'Mobilidade' && !volume[m])
                    .join(', ') || 'nenhum'}
                  .
                </p>
              </details>
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
                <details className="studio-advanced" open={!guided}>
                  <summary>Configurar cardio para este dia</summary>
                  <CardioEditor
                    items={currentDay.cardio ?? []}
                    onChange={(cardio) => editDay((day) => ({ ...day, cardio }))}
                  />
                </details>
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
                      setConfirmation({
                        title: 'Excluir dia de treino?',
                        description:
                          currentDay.name + ' e seus exercícios serão retirados deste rascunho.',
                        accept: () => {
                          edit({
                            ...draft,
                            days: draft.days.filter((_, index) => index !== dayIndex),
                          });
                          setDayIndex(0);
                        },
                      });
                    }}
                  >
                    <Trash2 size={16} />
                    Excluir dia
                  </Button>
                </div>
                <div className="plan-day-heading">
                  <div>
                    <h2>{currentDay.name}</h2>
                    <p>
                      {currentDay.weekday} · {estimateDay(currentDay).sets} séries · cerca de{' '}
                      {estimateDay(currentDay).minutes} min
                    </p>
                  </div>
                  <Button
                    ref={libraryButton}
                    disabled={currentDay.exercises.length >= 20}
                    onClick={() => setLibraryOpen(true)}
                  >
                    <Plus size={16} />
                    Adicionar exercícios
                  </Button>
                </div>
                {libraryOpen && (
                  <StudioLibrary
                    catalog={catalog}
                    remaining={20 - currentDay.exercises.length}
                    onAdd={(id) =>
                      editDay((day) => ({ ...day, exercises: [...day.exercises, makeRow(id)] }))
                    }
                    onClose={() => {
                      setLibraryOpen(false);
                      requestAnimationFrame(() => libraryButton.current?.focus());
                    }}
                  />
                )}
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
                    </div>
                    <details
                      className="studio-advanced"
                      name="exercise-options"
                      onToggle={(event) => {
                        if (event.currentTarget.open) setExpandedRow(row.id);
                        else setExpandedRow((current) => (current === row.id ? null : current));
                      }}
                    >
                      <summary>Substituir, orientar carga ou adicionar observações</summary>
                      {expandedRow === row.id && (
                        <>
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
                              {catalog.map((exercise) => (
                                <option key={exercise.id} value={exercise.id}>
                                  {exercise.name}
                                </option>
                              ))}
                            </select>
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
                          <div className="form-grid">
                            {(['rir', 'rpe'] as const).map((key) => (
                              <Field
                                key={key}
                                label={
                                  key === 'rir'
                                    ? 'Repetições em reserva (RIR, opcional)'
                                    : 'Esforço percebido (RPE 0–10, opcional)'
                                }
                                htmlFor={key + row.id}
                              >
                                <Input
                                  id={key + row.id}
                                  type="number"
                                  min={0}
                                  max={10}
                                  step={key === 'rir' ? 1 : 0.5}
                                  value={row[key] ?? ''}
                                  onChange={(e) =>
                                    editRow(row.id, {
                                      [key]:
                                        e.target.value === '' ? undefined : e.target.valueAsNumber,
                                    })
                                  }
                                />
                              </Field>
                            ))}
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
                        </>
                      )}
                    </details>
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
                          setConfirmation({
                            title: 'Remover exercício da ficha?',
                            description:
                              exerciseName(row.exerciseId) +
                              ' será retirado deste dia. Você também pode desfazer essa alteração no editor.',
                            accept: () =>
                              editDay((day) => ({
                                ...day,
                                exercises: day.exercises.filter((item) => item.id !== row.id),
                              })),
                          })
                        }
                      >
                        Remover exercício
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          act(() => {
                            const base = catalog.find((e) => e.id === row.exerciseId)!;
                            const alternate = catalog.find(
                              (e) =>
                                e.id !== base.id &&
                                !currentDay.exercises.some((item) => item.exerciseId === e.id) &&
                                e.pattern === base.pattern &&
                                (!draft.questionnaire ||
                                  (e.requires.every((r) =>
                                    draft.questionnaire!.equipment.includes(
                                      r as Questionnaire['equipment'][number],
                                    ),
                                  ) &&
                                    !draft.questionnaire.excluded.includes(e.id) &&
                                    !draft.questionnaire.avoidPatterns.includes(e.pattern))),
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
              </PageMotion>
            </Panel>
          </div>
          <Panel className="module-panel review-panel">
            <p className="eyebrow">3 · Revisar e enviar</p>
            <h2 id="studio-review" tabIndex={-1}>
              Revisar antes de atribuir
            </h2>
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
      <Dialog
        open={!!confirmation}
        onOpenChange={(isOpen) => {
          if (!isOpen) setConfirmation(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmation?.title}</DialogTitle>
            <DialogDescription>{confirmation?.description}</DialogDescription>
          </DialogHeader>
          <Button variant="outline" onClick={() => setConfirmation(null)}>
            Continuar editando
          </Button>
          <Button
            onClick={() => {
              confirmation?.accept();
              setConfirmation(null);
            }}
          >
            Confirmar
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
            <WorkoutOutline
              key={day.id}
              workout={deliverDay(draft, day, day.id)}
              library={data.exercises}
            />
          ))}
        </DialogContent>
      </Dialog>
    </>
  );
}
