'use client';
import { useRef, useState } from 'react';
import { Field, Panel } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageMotion } from '@/components/motion';
import { useDemo } from '@/components/providers';
import { GOALS, EQUIPMENT, WEEKDAYS, DAY_FOCUS, type Questionnaire } from '@/domain/experience';
import { normalize } from '@/domain/selectors';
import {
  TRAINING_GROUPS,
  TRAINING_MODELS,
  recommendModel,
  modelFor,
  previewWeek,
  type TrainingModel,
} from '@/domain/training-models';
import { reviewReasons } from '@/domain/training-engine';
import type { CatalogExercise } from '@/domain/exercise-catalog';
import { CardioQuestion } from './cardio';

type Stage = 'essentials' | 'models' | 'week';
export function StudioPlanning({
  q,
  setQ,
  catalog,
  startingStage,
  selectStudent,
  generate,
  supervised,
  error,
  setError,
  revising,
}: {
  q: Questionnaire;
  setQ: (next: Questionnaire) => void;
  catalog: CatalogExercise[];
  startingStage: Stage;
  selectStudent: (id: string) => Questionnaire;
  generate: (answers: Questionnaire) => void;
  supervised: (answers: Questionnaire) => void;
  error: string;
  setError: (message: string) => void;
  revising: boolean;
}) {
  const data = useDemo();
  const [stage, setStage] = useState<Stage>(startingStage);
  const [confirmed, setConfirmed] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [otherModels, setOtherModels] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const model = q.modelId ? modelFor(q) : recommendModel(q);
  const answers = { ...q, modelId: model.id, split: model.split };
  const week = previewWeek(answers);
  const reasons = reviewReasons(answers);
  const student = data.students.find((s) => s.id === q.studentId);
  const change = <K extends keyof Questionnaire>(key: K, value: Questionnaire[K]) =>
    setQ({ ...q, [key]: value });
  function navigate(next: Stage) {
    setError('');
    setStage(next);
    requestAnimationFrame(() => title.current?.focus());
  }
  function choose(selected: TrainingModel) {
    setQ({
      ...q,
      modelId: selected.id,
      split: selected.split,
      dayFocus: undefined,
      dayGroups: undefined,
    });
    setCustomizing(selected.id === 'custom');
    navigate(confirmed ? 'week' : 'essentials');
  }
  const term = normalize(search.trim());
  const models = TRAINING_MODELS.filter((item) =>
    term
      ? normalize([item.name, item.description, item.category, item.split].join(' ')).includes(term)
      : otherModels
        ? item.secondary
        : !item.secondary && item.category === category,
  );
  return (
    <Panel className="module-panel">
      <PageMotion focusPage={false} route={'studio-planning-' + stage}>
        <h2 ref={title} tabIndex={-1}>
          {stage === 'essentials'
            ? 'Dados do treino'
            : stage === 'models'
              ? 'Escolher divisão'
              : 'Prévia da semana'}
        </h2>
        {stage === 'models' && (
          <div className="form-stack">
            <Field label="Buscar divisão por nome ou finalidade" htmlFor="model-search">
              <Input
                id="model-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Field>
            {!term && (
              <div className="form-actions" aria-label="Categorias de divisão">
                {[
                  ...new Set(
                    TRAINING_MODELS.filter((item) => !item.secondary).map((item) => item.category),
                  ),
                ].map((name) => (
                  <Button
                    key={name}
                    variant="outline"
                    aria-pressed={!otherModels && category === name}
                    onClick={() => {
                      setCategory(name);
                      setOtherModels(false);
                    }}
                  >
                    {name}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  aria-pressed={otherModels}
                  onClick={() => {
                    setOtherModels(!otherModels);
                    setCategory('');
                  }}
                >
                  Ver outros modelos
                </Button>
              </div>
            )}
            {models.map((item) => (
              <button
                type="button"
                key={item.id}
                className="day-tab"
                aria-label={item.name}
                onClick={() => choose(item)}
              >
                <strong>{item.name}</strong>
                <span>
                  {item.description} · {item.frequencies.join(', ')} dias por semana
                </span>
              </button>
            ))}
            {term && !models.length && <p role="status">Nenhum modelo encontrado.</p>}
            {confirmed && (
              <Button variant="outline" onClick={() => navigate('week')}>
                Voltar à prévia
              </Button>
            )}
          </div>
        )}
        {stage === 'essentials' && (
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              if (!q.days.length) {
                setError('Selecione pelo menos um dia disponível.');
                document.getElementById('studio-days')?.focus();
                return;
              }
              if (!q.equipment.length) {
                setError('Selecione os equipamentos disponíveis.');
                document.getElementById('studio-equipment')?.focus();
                return;
              }
              setConfirmed(true);
              navigate('week');
            }}
          >
            <div className="form-grid">
              <Field label="Aluno" htmlFor="studio-student">
                <select
                  id="studio-student"
                  className="native-select"
                  value={q.studentId}
                  onChange={(e) => {
                    const profile = selectStudent(e.target.value);
                    setQ({
                      ...profile,
                      modelId: q.modelId,
                      split: q.split,
                      dayFocus: undefined,
                      dayGroups: undefined,
                    });
                    setError('');
                  }}
                >
                  {data.students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
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
                  onChange={(e) => change('location', e.target.value as Questionnaire['location'])}
                >
                  {['Academia', 'Casa', 'Estúdio'].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </Field>
              <Field label="Idade" htmlFor="studio-age">
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
            </div>
            {student?.goal && <p className="form-help">Objetivo cadastrado: {student.goal}.</p>}
            <fieldset>
              <legend
                id="studio-days"
                tabIndex={-1}
                aria-describedby={error && !q.days.length ? 'studio-days-error' : undefined}
              >
                Dias disponíveis
              </legend>
              {error && !q.days.length && (
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
                      onChange={(e) => {
                        const days = WEEKDAYS.filter((d) =>
                          d === day ? e.target.checked : q.days.includes(d),
                        );
                        setQ({ ...q, days, frequency: days.length });
                        setError('');
                      }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </fieldset>
            <details className="studio-advanced">
              <summary id="studio-equipment">
                Equipamentos disponíveis · {q.equipment.join(', ') || 'Selecionar'}
              </summary>
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
            </details>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={q.specialContext}
                onChange={(e) => change('specialContext', e.target.checked)}
              />
              Contexto especial, dor relevante ou condição que exige avaliação individual
            </label>
            <details className="studio-advanced">
              <summary>Experiência, preferências e restrições</summary>
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
              <Field label="Acompanhamento" htmlFor="studio-coaching">
                <select
                  id="studio-coaching"
                  className="native-select"
                  value={q.coaching}
                  onChange={(e) => change('coaching', e.target.value as Questionnaire['coaching'])}
                >
                  <option>Presencial</option>
                  <option>Online</option>
                </select>
              </Field>
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
              <Field label="Grupo prioritário" htmlFor="priority-muscle">
                <select
                  id="priority-muscle"
                  className="native-select"
                  value={q.priority ?? ''}
                  onChange={(e) => change('priority', e.target.value)}
                >
                  <option value="">Distribuir o volume</option>
                  {TRAINING_GROUPS.map((group) => (
                    <option key={group}>{group}</option>
                  ))}
                </select>
              </Field>
            </details>
            <div className="form-actions">
              <Button type="submit">Ver prévia da semana</Button>
            </div>
          </form>
        )}
        {stage === 'week' && (
          <div className="form-stack">
            <div>
              <h3>{model.name}</h3>
              <p>{model.description}</p>
              <p className="form-help">
                {student?.name} · {q.goal} · {q.level} · {q.minutes} min por sessão
              </p>
            </div>
            <ol className="model-week">
              {week.map((day) => (
                <li key={day.weekday}>
                  <strong>{day.weekday}</strong>
                  <span>{day.focus}</span>
                </li>
              ))}
            </ol>
            {!model.frequencies.includes(q.frequency) && (
              <p role="status" className="field-error">
                Esta divisão prevê {model.frequencies.join(', ')} dias por semana. Ajuste os dias ou
                escolha outra divisão.
              </p>
            )}
            <div className="form-actions">
              <Button
                disabled={!model.frequencies.includes(q.frequency)}
                onClick={() => generate(answers)}
              >
                {revising ? 'Salvar ficha atual e gerar nova proposta' : 'Gerar treino'}
              </Button>
              <Button variant="outline" onClick={() => navigate('models')}>
                Mudar divisão
              </Button>
              <Button
                variant="outline"
                aria-expanded={customizing}
                onClick={() => setCustomizing(!customizing)}
              >
                Personalizar
              </Button>
              <Button variant="ghost" onClick={() => navigate('essentials')}>
                Editar dados do treino
              </Button>
            </div>
            {customizing && (
              <div className="form-stack">
                <CardioQuestion value={q.cardio} onChange={(value) => change('cardio', value)} />
                <fieldset>
                  <legend>Foco e grupos por dia</legend>
                  {week.map(({ weekday, focus }) => (
                    <details key={weekday} className="studio-advanced">
                      <summary>
                        {weekday} · {focus}
                      </summary>
                      <Field label={'Foco de ' + weekday} htmlFor={'focus-' + weekday}>
                        <select
                          className="native-select"
                          id={'focus-' + weekday}
                          value={q.dayFocus?.[weekday] ?? ''}
                          onChange={(e) =>
                            setQ({
                              ...q,
                              split: model.split,
                              modelId: model.id,
                              dayGroups: { ...q.dayGroups, [weekday]: [] },
                              dayFocus: {
                                ...q.dayFocus,
                                [weekday]: e.target.value as (typeof DAY_FOCUS)[number],
                              },
                            })
                          }
                        >
                          <option value="" disabled>
                            Escolher foco
                          </option>
                          {DAY_FOCUS.map((f) => (
                            <option key={f}>{f}</option>
                          ))}
                        </select>
                      </Field>
                      <fieldset>
                        <legend>Grupos de {weekday}</legend>
                        <div className="choice-grid">
                          {TRAINING_GROUPS.map((group) => {
                            const groups = q.dayGroups?.[weekday] ?? [];
                            return (
                              <label key={group} className="checkbox-row">
                                <input
                                  type="checkbox"
                                  checked={groups.includes(group)}
                                  onChange={(e) =>
                                    setQ({
                                      ...q,
                                      split: model.split,
                                      modelId: model.id,
                                      dayGroups: {
                                        ...q.dayGroups,
                                        [weekday]: e.target.checked
                                          ? [...groups, group]
                                          : groups.filter((g) => g !== group),
                                      },
                                    })
                                  }
                                />
                                {group}
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    </details>
                  ))}
                </fieldset>
              </div>
            )}
            {!!reasons.length && (
              <div className="review-required" role="status">
                <h3>Revisão individual obrigatória</h3>
                {reasons.map((reason) => (
                  <p key={reason}>{reason}</p>
                ))}
                <Button variant="outline" onClick={() => supervised(answers)}>
                  Abrir planejamento supervisionado
                </Button>
              </div>
            )}
            {error && !reasons.length && (
              <Button variant="outline" onClick={() => supervised(answers)}>
                Montar ficha manual
              </Button>
            )}
          </div>
        )}
      </PageMotion>
    </Panel>
  );
}
