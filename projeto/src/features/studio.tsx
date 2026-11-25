'use client';
import { GuideHint, useGuide } from '@/components/guided-mode';
import { useMemo, useRef, useState } from 'react';
import { CardioEditor } from './cardio';
import { StudioPlanning } from './studio-planning';
import { TRAINING_GROUPS, modelFor } from '@/domain/training-models';
import { normalize } from '@/domain/selectors';
import type { DemoState } from '@/domain/types';
import Link from 'next/link';
import { ArrowRight, Check, Plus, RefreshCw, Trash2 } from 'lucide-react';
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
  GOALS,
  WEEKDAYS,
  questionnaireSchema,
  type Questionnaire,
  type Program,
  type TrainingDay,
  type StudioExercise,
} from '@/domain/experience';
import { StudioLibrary } from './studio-library';
import { WorkoutOutline } from '@/components/workout-outline';
import { deliverDay } from '@/domain/workout-delivery';
import { estimateDay, assessProgram } from '@/domain/training-plan';
import { studioCatalog } from '@/domain/exercise-catalog';
import { generateProgram, regenerateDays, RULE_VERSION } from '@/domain/training-engine';
import { approveProgram, newId, saveProgram } from '@/services/experience-service';
import { errorMessage } from '@/domain/schemas';

const initialQuestionnaire: Omit<Questionnaire, 'age' | 'studentId'> = {
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
function studentQuestionnaire(data: DemoState, studentId: string): Questionnaire {
  const student = data.students.find((item) => item.id === studentId);
  const recent = data.experience.programs.find(
    (p) => p.studentId === studentId && p.questionnaire?.studentId === studentId,
  )?.questionnaire;
  const profileGoal = normalize(student?.goal ?? '');
  const matchingGoal = GOALS.find((goal) => normalize(goal) === profileGoal);
  return {
    ...structuredClone(recent ?? initialQuestionnaire),
    studentId,
    age: data.experience.ages[studentId] ?? recent?.age ?? NaN,
    goal: matchingGoal ?? recent?.goal ?? initialQuestionnaire.goal,
  };
}
const makeDay = (weekday: string = WEEKDAYS[0]): TrainingDay => ({
  id: newId(),
  name: 'Novo dia',
  weekday,
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
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    accept: () => void;
  } | null>(null);
  const captureOrder = useExerciseReorder();
  const data = useDemo();
  const repository = useRepository();
  const [view, setView] = useState<'home' | 'wizard' | 'editor' | 'templates' | 'versions'>('home');
  const [startingStage, setStartingStage] = useState<'essentials' | 'models'>('essentials');
  const [q, setQ] = useState<Questionnaire>(() =>
    studentQuestionnaire(data, data.students[0]?.id ?? ''),
  );
  const [draft, setDraft] = useState<Program | null>(null);
  const [undo, setUndo] = useState<Program[]>([]);
  const [dayIndex, setDayIndex] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [revising, setRevising] = useState(false);
  const libraryButton = useRef<HTMLButtonElement>(null);
  const catalog = useMemo(() => studioCatalog(data.exercises), [data.exercises]);
  const assessment = useMemo(
    () => assessProgram(draft?.days ?? [], draft?.questionnaire, catalog),
    [draft?.days, draft?.questionnaire, catalog],
  );
  const exerciseName = (id: string) => catalog.find((e) => e.id === id)?.name ?? id;
  const context = { history: data.sessions, favorites: data.experience.exerciseFavorites };
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [pending, setPending] = useState<Program | null>(null);
  const [preview, setPreview] = useState(false);
  const [generation, setGeneration] = useState(0);
  const act = (action: () => void) => {
    setError('');
    setFeedback('');
    try {
      action();
    } catch (error) {
      setError(errorMessage(error));
    }
  };
  function startPlanning(stage: 'models' | 'essentials') {
    const profile = studentQuestionnaire(
      data,
      data.students.find((s) => s.id === q.studentId)?.id ?? data.students[0]?.id ?? '',
    );
    setQ({
      ...profile,
      modelId: undefined,
      split: initialQuestionnaire.split,
      dayFocus: undefined,
      dayGroups: undefined,
    });
    setStartingStage(stage);
    setRevising(false);
    setError('');
    setFeedback('');
    setView('wizard');
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
  function blank(supervised = false, answers = q) {
    open({
      id: '',
      title: supervised ? 'Planejamento supervisionado' : 'Minha nova ficha',
      studentId: answers.studentId || data.students[0]?.id || '',
      questionnaire: supervised ? answers : undefined,
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
  function generate(answers: Questionnaire) {
    act(() => {
      const parsed = questionnaireSchema.parse(answers);
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
            ? 'MOVRA Studio · Planejamento'
            : view === 'editor'
              ? 'MOVRA Studio · Revisão'
              : 'MOVRA Studio · Treinamento'
        }
        title={
          {
            home: 'Criar e editar treinos',
            wizard: 'Gerar uma proposta de treino',
            editor: 'Editar ficha de treino',
            templates: 'Modelos salvos',
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
          ? 'Confira os dados do aluno e veja como a semana será organizada. Você pode ajustar a divisão antes de gerar.'
          : view === 'editor'
            ? 'Escolha o dia, ajuste os exercícios e use Visualizar como o aluno. Depois de salvar, revise e aprove a versão para atribuí-la.'
            : 'Escolha Gerar para mim para receber uma sugestão, selecione uma divisão ou crie sua própria ficha.'}
      </GuideHint>
      <Feedback error={error} success={feedback} />
      {view === 'home' &&
        !onlyReview &&
        (data.students.length ? (
          <div className="planning-entry">
            <div className="studio-launch">
              <button
                aria-label="Gerar para mim"
                aria-describedby="studio-auto-description"
                onClick={() => startPlanning('essentials')}
              >
                <strong>
                  Gerar para mim <ArrowRight size={18} />
                </strong>
                <span id="studio-auto-description">
                  A MOVRA organiza uma sugestão de treino para seu aluno.
                </span>
              </button>
              <button
                aria-label="Escolher divisão"
                aria-describedby="studio-model-description"
                onClick={() => startPlanning('models')}
              >
                <strong>
                  Escolher divisão <ArrowRight size={18} />
                </strong>
                <span id="studio-model-description">
                  Escolha como organizar os treinos da semana.
                </span>
              </button>
              <button
                aria-label="Criar do zero"
                aria-describedby="studio-manual-description"
                onClick={() => blank()}
              >
                <strong>
                  Criar do zero <Plus size={18} />
                </strong>
                <span id="studio-manual-description">
                  Monte uma ficha completamente personalizada.
                </span>
              </button>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Cadastre seu primeiro aluno"
            description="Com um aluno cadastrado, você poderá preparar e atribuir a ficha."
            action={
              <Link className="text-link" href="/personal/alunos">
                Cadastrar aluno
              </Link>
            }
          />
        ))}
      {view !== 'wizard' && (
        <details className="studio-tools" open={!guided}>
          <summary>Outras ferramentas do Studio</summary>
          <div className="module-nav">
            {view !== 'templates' && (
              <Button variant="outline" onClick={() => leaveEditor(() => setView('templates'))}>
                Modelos salvos
              </Button>
            )}
            {view !== 'versions' && (
              <Button variant="outline" onClick={() => leaveEditor(() => setView('versions'))}>
                Histórico de versões
              </Button>
            )}
          </div>
        </details>
      )}
      {view === 'wizard' && (
        <>
          {revising && (
            <Button variant="outline" onClick={() => setView('editor')}>
              Voltar à ficha em edição
            </Button>
          )}
          <StudioPlanning
            q={q}
            setQ={setQ}
            catalog={catalog}
            startingStage={startingStage}
            selectStudent={(id) => studentQuestionnaire(data, id)}
            generate={generate}
            supervised={(answers) => {
              repository.updateExperience((state) => ({
                ...state,
                ages: { ...state.ages, [answers.studentId]: answers.age },
              }));
              blank(true, answers);
            }}
            error={error}
            setError={setError}
            revising={revising}
          />
        </>
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
                    setStartingStage('essentials');
                    const answers = structuredClone(draft.questionnaire!);
                    setQ({ ...answers, modelId: modelFor(answers).id });
                    setView('wizard');
                  }}
                >
                  Rever respostas
                </Button>
              )}
              <Button
                variant="outline"
                disabled={!draft.questionnaire}
                onClick={() => regenerate(true)}
              >
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
                  edit({
                    ...draft,
                    days: [
                      ...draft.days,
                      makeDay(
                        WEEKDAYS.find(
                          (weekday) => !draft.days.some((day) => day.weekday === weekday),
                        ),
                      ),
                    ],
                  });
                  setDayIndex(draft.days.length);
                }}
              >
                <Plus size={16} />
                Adicionar dia
              </Button>
              <details className="studio-advanced">
                <summary>Volume e cobertura semanal</summary>
                {Object.entries(assessment.volume).map(([muscle, sets]) => (
                  <p key={muscle}>
                    {muscle} · {sets} séries diretas
                  </p>
                ))}
                <p>
                  Grupos sem séries diretas:{' '}
                  {TRAINING_GROUPS.filter((m) => m !== 'Mobilidade' && !assessment.volume[m]).join(
                    ', ',
                  ) || 'nenhum'}
                  .
                </p>
                {[...assessment.errors, ...assessment.warnings].map((message) => (
                  <p key={message}>{message}</p>
                ))}
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
                <details className="studio-advanced">
                  <summary>Grupos musculares planejados</summary>
                  <fieldset>
                    <legend>Grupos de {currentDay.name}</legend>
                    <div className="choice-grid">
                      {TRAINING_GROUPS.map((group) => (
                        <label key={group} className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={currentDay.groups?.includes(group) ?? false}
                            onChange={(event) => {
                              const selected = event.target.checked;
                              editDay((day) => ({
                                ...day,
                                groups: selected
                                  ? [...(day.groups ?? []), group]
                                  : day.groups?.filter((g) => g !== group),
                              }));
                            }}
                          />
                          {group}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </details>
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
                  <Button
                    variant="outline"
                    disabled={!draft.questionnaire}
                    onClick={() => regenerate()}
                  >
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
