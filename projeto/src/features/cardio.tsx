'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Plus } from 'lucide-react';
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
import { Panel, Field, Feedback } from '@/components/shared';
import { useDemo, useRepository } from '@/components/providers';
import { useDemoSession } from '@/components/demo-session';
import {
  CARDIO_CATALOG,
  CARDIO_TYPES,
  cardioSchema,
  cardioSeconds,
  parameterLabels,
  cardioStages,
  makeCardio,
  modalitySchema,
  type Cardio,
} from '@/domain/cardio';
import type { Questionnaire } from '@/domain/experience';
import type { Workout } from '@/domain/types';
import { civilDate, completionReward, type CompletionReward } from '@/domain/habits';
import { HabitCelebration } from './student/habits';
import { saveCardioRecord } from '@/services/cardio-service';
import { errorMessage } from '@/domain/schemas';
const uid = () => crypto.randomUUID();
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export function CardioLibrary() {
  const data = useDemo(),
    repository = useRepository();
  const [query, setQuery] = useState(''),
    [error, setError] = useState('');
  const modalities = [...CARDIO_CATALOG, ...(data.experience.cardioModalities ?? [])];
  return (
    <Panel className="module-panel section-gap">
      <h2>
        <Activity aria-hidden size={22} /> Biblioteca de cardio
      </h2>
      <p>
        Modalidades aeróbicas · parâmetros revisáveis, sem mídia cadastrada. Distância em km, tempo
        em minutos; resistência é o nível do equipamento, sem conversão universal.
      </p>
      <Field label="Buscar modalidade de cardio" htmlFor="cardio-library-search">
        <Input
          id="cardio-library-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Field>
      <div className="cardio-library">
        {modalities
          .filter((m) => m.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
          .map((m) => (
            <details key={m.id}>
              <summary>{m.name}</summary>
              <p>{m.description}</p>
              <p>Equipamentos: {m.equipment}</p>
              <p>Unidades: min{m.parameters.map((p) => ` · ${parameterLabels[p]}`).join('')}</p>
              <p>
                Alternativas: {m.alternatives.join(', ') || 'Selecionar após revisão profissional.'}
              </p>
            </details>
          ))}
      </div>
      <details>
        <summary>Cadastrar modalidade própria</summary>
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const f = new FormData(e.currentTarget);
              const m = modalitySchema.parse({
                id: uid(),
                name: f.get('name'),
                equipment: f.get('equipment'),
                description: f.get('description'),
                parameters: f.getAll('parameters'),
                alternatives: [],
              });
              repository.updateExperience((s) => ({
                ...s,
                cardioModalities: [...(s.cardioModalities ?? []), m],
              }));
              e.currentTarget.reset();
              setError('');
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
        >
          <Field label="Nome da modalidade" htmlFor="custom-cardio-name">
            <Input id="custom-cardio-name" name="name" required minLength={2} maxLength={100} />
          </Field>
          <Field label="Equipamentos da modalidade" htmlFor="custom-cardio-equipment">
            <Input id="custom-cardio-equipment" name="equipment" required minLength={2} />
          </Field>
          <Field label="Descrição técnica da modalidade" htmlFor="custom-cardio-description">
            <Textarea id="custom-cardio-description" name="description" required minLength={2} />
          </Field>
          <fieldset>
            <legend>Parâmetros aplicáveis</legend>
            {Object.entries(parameterLabels).map(([key, label]) => (
              <label className="checkbox-row" key={key}>
                <input type="checkbox" name="parameters" value={key} />
                {label}
              </label>
            ))}
          </fieldset>
          <Feedback error={error} />
          <Button type="submit">Salvar modalidade</Button>
        </form>
      </details>
    </Panel>
  );
}
export function CardioQuestion({
  value,
  onChange,
}: {
  value: Questionnaire['cardio'];
  onChange: (v: NonNullable<Questionnaire['cardio']>) => void;
}) {
  const q = value ?? {
    include: 'Deixar o profissional decidir' as const,
    goal: 'Condicionamento geral',
    modalities: [],
    frequency: 1,
    minutes: 10,
    experience: 'Não informada',
    notes: '',
  };
  return (
    <fieldset className="module-panel">
      <legend>Organização do cardio</legend>
      <Field label="Você deseja incluir cardio no treinamento?" htmlFor="cardio-include">
        <select
          id="cardio-include"
          className="native-select"
          value={q.include}
          onChange={(e) => onChange({ ...q, include: e.target.value as typeof q.include })}
        >
          {['Sim', 'Não', 'Deixar o profissional decidir'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </Field>
      {q.include === 'Sim' && (
        <>
          <Field label="Objetivo aeróbico" htmlFor="cardio-goal">
            <Input
              id="cardio-goal"
              value={q.goal}
              maxLength={150}
              onChange={(e) => onChange({ ...q, goal: e.target.value })}
            />
          </Field>
          <fieldset>
            <legend>Modalidades disponíveis e preferidas</legend>
            <div className="choice-grid">
              {CARDIO_CATALOG.map((m) => (
                <label key={m.id} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={q.modalities.includes(m.id)}
                    onChange={(e) =>
                      onChange({
                        ...q,
                        modalities: e.target.checked
                          ? [...q.modalities, m.id]
                          : q.modalities.filter((id) => id !== m.id),
                      })
                    }
                  />
                  {m.name}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-grid">
            <Field label="Frequência de cardio desejada" htmlFor="cardio-q-frequency">
              <Input
                id="cardio-q-frequency"
                type="number"
                min={1}
                max={7}
                value={q.frequency}
                onChange={(e) => onChange({ ...q, frequency: Number(e.target.value) })}
              />
            </Field>
            <Field label="Tempo de cardio por sessão (min)" htmlFor="cardio-q-minutes">
              <Input
                id="cardio-q-minutes"
                type="number"
                min={1}
                max={120}
                value={q.minutes}
                onChange={(e) => onChange({ ...q, minutes: Number(e.target.value) })}
              />
            </Field>
          </div>
          <Field label="Experiência anterior com cardio" htmlFor="cardio-q-experience">
            <Input
              id="cardio-q-experience"
              value={q.experience}
              maxLength={150}
              onChange={(e) => onChange({ ...q, experience: e.target.value })}
            />
          </Field>
          <Field label="Preferências e observações sobre cardio" htmlFor="cardio-q-notes">
            <Textarea
              id="cardio-q-notes"
              value={q.notes}
              maxLength={500}
              onChange={(e) => onChange({ ...q, notes: e.target.value })}
            />
          </Field>
          <p className="form-help">
            O tempo será reservado dentro da sessão total. Frequência superior aos dias disponíveis
            ou contexto especial exige revisão. Não há intensidade automática por idade ou nível.
          </p>
        </>
      )}
    </fieldset>
  );
}
export function CardioEditor({
  items,
  onChange,
}: {
  items: Cardio[];
  onChange: (v: Cardio[]) => void;
}) {
  const data = useDemo();
  const [draft, setDraft] = useState<Cardio | null>(null),
    [error, setError] = useState('');
  const modalities = [...CARDIO_CATALOG, ...(data.experience.cardioModalities ?? [])];
  const update = (patch: Partial<Cardio>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  return (
    <section className="cardio-editor section-gap">
      <h2>Cardio na mesma ficha</h2>
      <p className="form-help">
        Antes, depois da musculação ou em dia independente. Salvar mantém a ficha em rascunho até
        nova aprovação.
      </p>
      {items.map((c, index) => (
        <article className="cardio-card" key={c.id}>
          <p className="eyebrow">
            {c.position} · {c.type}
          </p>
          <h3>{c.modality.name}</h3>
          <p>
            {clock(cardioSeconds(c))} · {c.intensity} · {c.frequency}×/semana
          </p>
          <div className="form-actions">
            <Button
              variant="outline"
              onClick={() => {
                setDraft(structuredClone(c));
                setError('');
              }}
            >
              Editar cardio {index + 1}
            </Button>
            <Button variant="ghost" onClick={() => onChange(items.filter((x) => x.id !== c.id))}>
              Remover cardio {index + 1}
            </Button>
            <Button
              variant="ghost"
              disabled={index === 0}
              onClick={() => {
                const next = [...items];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                onChange(next);
              }}
            >
              Subir cardio {index + 1}
            </Button>
          </div>
        </article>
      ))}
      <Button
        variant="outline"
        disabled={items.length >= 10}
        onClick={() => {
          setDraft(makeCardio());
          setError('');
        }}
      >
        <Plus size={16} />
        Adicionar cardio
      </Button>
      <Dialog
        open={!!draft}
        onOpenChange={(open) => {
          if (!open) setDraft(null);
        }}
      >
        <DialogContent className="cardio-dialog">
          <DialogHeader>
            <DialogTitle>Prescrição de cardio</DialogTitle>
            <DialogDescription>
              Proposta profissional editável. Sem zonas cardíacas calculadas pela idade e sem gasto
              calórico estimado.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const parsed = cardioSchema.parse(draft);
                  onChange(
                    items.some((c) => c.id === parsed.id)
                      ? items.map((c) => (c.id === parsed.id ? parsed : c))
                      : [...items, parsed],
                  );
                  setDraft(null);
                } catch (err) {
                  setError(errorMessage(err));
                }
              }}
            >
              <Field label="Modalidade de cardio" htmlFor="cardio-modality">
                <select
                  id="cardio-modality"
                  className="native-select"
                  value={draft.modality.id}
                  onChange={(e) => {
                    const modality = modalities.find((m) => m.id === e.target.value)!;
                    update({
                      modality,
                      distance: undefined,
                      speed: undefined,
                      incline: undefined,
                      resistance: undefined,
                      cadence: undefined,
                    });
                  }}
                >
                  {modalities.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="form-grid">
                <Field label="Tipo de cardio" htmlFor="cardio-type">
                  <select
                    id="cardio-type"
                    className="native-select"
                    value={draft.type}
                    onChange={(e) =>
                      update({
                        type: e.target.value as Cardio['type'],
                        ...(['Contínuo', 'Livre'].includes(e.target.value)
                          ? { blocks: [], cycles: 1 }
                          : {}),
                      })
                    }
                  >
                    {CARDIO_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Posição do cardio" htmlFor="cardio-position">
                  <select
                    id="cardio-position"
                    className="native-select"
                    value={draft.position}
                    onChange={(e) => update({ position: e.target.value as Cardio['position'] })}
                  >
                    {['Antes', 'Depois', 'Independente'].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Duração orientativa (min)" htmlFor="cardio-minutes">
                  <Input
                    id="cardio-minutes"
                    type="number"
                    min={0.1}
                    max={240}
                    step="any"
                    value={draft.minutes}
                    onChange={(e) => update({ minutes: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Frequência semanal de cardio" htmlFor="cardio-frequency">
                  <Input
                    id="cardio-frequency"
                    type="number"
                    min={1}
                    max={7}
                    value={draft.frequency}
                    onChange={(e) => update({ frequency: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <Field label="Método de intensidade" htmlFor="cardio-method">
                <select
                  id="cardio-method"
                  className="native-select"
                  value={draft.method}
                  onChange={(e) =>
                    update({
                      method: e.target.value as Cardio['method'],
                      hrMin: undefined,
                      hrMax: undefined,
                    })
                  }
                >
                  {[
                    'Descrição qualitativa',
                    'RPE',
                    'Teste da fala',
                    'Faixa cardíaca profissional',
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Intensidade orientativa" htmlFor="cardio-intensity">
                <Input
                  id="cardio-intensity"
                  required
                  maxLength={150}
                  value={draft.intensity}
                  onChange={(e) => update({ intensity: e.target.value })}
                />
              </Field>
              <p className="form-help">
                RPE: escala subjetiva de 0 a 10. Teste da fala: descrever a orientação apropriada ao
                contexto. Esses métodos não garantem adequação individual.
              </p>
              <div className="form-grid">
                {draft.method === 'Faixa cardíaca profissional' &&
                  (['hrMin', 'hrMax'] as const).map((key, i) => (
                    <Field
                      key={key}
                      label={i ? 'FC máxima orientada (bpm)' : 'FC mínima orientada (bpm)'}
                      htmlFor={key}
                    >
                      <Input
                        id={key}
                        type="number"
                        required
                        min={30}
                        max={240}
                        value={draft[key] ?? ''}
                        onChange={(e) =>
                          update({ [key]: e.target.value ? Number(e.target.value) : undefined })
                        }
                      />
                    </Field>
                  ))}
                {draft.modality.parameters.map((key) => (
                  <Field key={key} label={parameterLabels[key]} htmlFor={`cardio-${key}`}>
                    <Input
                      id={`cardio-${key}`}
                      type="number"
                      min={key === 'incline' || key === 'resistance' ? 0 : 0.01}
                      step="any"
                      value={draft[key] ?? ''}
                      onChange={(e) =>
                        update({ [key]: e.target.value ? Number(e.target.value) : undefined })
                      }
                    />
                  </Field>
                ))}
              </div>
              <Field label="Instruções do cardio" htmlFor="cardio-notes">
                <Textarea
                  id="cardio-notes"
                  maxLength={1000}
                  value={draft.notes}
                  onChange={(e) => update({ notes: e.target.value })}
                />
              </Field>
              {['Intervalado', 'Progressivo', 'Personalizado'].includes(draft.type) && (
                <fieldset>
                  <legend>Construtor de blocos</legend>
                  <Field label="Ciclos da sequência completa" htmlFor="cardio-cycles">
                    <Input
                      id="cardio-cycles"
                      type="number"
                      min={1}
                      max={100}
                      value={draft.cycles}
                      onChange={(e) => update({ cycles: Number(e.target.value) })}
                    />
                  </Field>
                  {draft.blocks.map((b, i) => (
                    <div className="cardio-block" key={b.id}>
                      <h3>Bloco {i + 1}</h3>
                      <div className="form-grid">
                        <Field label={`Tipo do bloco ${i + 1}`} htmlFor={`block-type-${b.id}`}>
                          <select
                            id={`block-type-${b.id}`}
                            className="native-select"
                            value={b.type}
                            onChange={(e) =>
                              update({
                                blocks: draft.blocks.map((x) =>
                                  x.id === b.id
                                    ? { ...x, type: e.target.value as typeof b.type }
                                    : x,
                                ),
                              })
                            }
                          >
                            {['Aquecimento', 'Esforço', 'Recuperação', 'Desaquecimento'].map(
                              (t) => (
                                <option key={t}>{t}</option>
                              ),
                            )}
                          </select>
                        </Field>
                        {(['seconds', 'repeats'] as const).map((key) => (
                          <Field
                            key={key}
                            label={`${key === 'seconds' ? 'Duração (s)' : 'Repetições'} do bloco ${i + 1}`}
                            htmlFor={`${key}-${b.id}`}
                          >
                            <Input
                              id={`${key}-${b.id}`}
                              type="number"
                              min={1}
                              max={key === 'seconds' ? 7200 : 100}
                              value={b[key]}
                              onChange={(e) =>
                                update({
                                  blocks: draft.blocks.map((x) =>
                                    x.id === b.id ? { ...x, [key]: Number(e.target.value) } : x,
                                  ),
                                })
                              }
                            />
                          </Field>
                        ))}
                      </div>
                      <Field label={`Intensidade do bloco ${i + 1}`} htmlFor={`intensity-${b.id}`}>
                        <Input
                          id={`intensity-${b.id}`}
                          value={b.intensity}
                          maxLength={150}
                          onChange={(e) =>
                            update({
                              blocks: draft.blocks.map((x) =>
                                x.id === b.id ? { ...x, intensity: e.target.value } : x,
                              ),
                            })
                          }
                        />
                      </Field>
                      <Field label={`Instruções do bloco ${i + 1}`} htmlFor={`notes-${b.id}`}>
                        <Textarea
                          id={`notes-${b.id}`}
                          maxLength={500}
                          value={b.notes}
                          onChange={(e) =>
                            update({
                              blocks: draft.blocks.map((x) =>
                                x.id === b.id ? { ...x, notes: e.target.value } : x,
                              ),
                            })
                          }
                        />
                      </Field>
                      <div className="form-actions">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            update({ blocks: draft.blocks.filter((x) => x.id !== b.id) })
                          }
                        >
                          Excluir bloco {i + 1}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={draft.blocks.length >= 30}
                          onClick={() => update({ blocks: [...draft.blocks, { ...b, id: uid() }] })}
                        >
                          Duplicar bloco {i + 1}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={i === 0}
                          onClick={() => {
                            const next = [...draft.blocks];
                            [next[i - 1], next[i]] = [next[i], next[i - 1]];
                            update({ blocks: next });
                          }}
                        >
                          Subir bloco {i + 1}
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={draft.blocks.length >= 30}
                    onClick={() =>
                      update({
                        blocks: [
                          ...draft.blocks,
                          {
                            id: uid(),
                            type: 'Esforço',
                            seconds: 60,
                            repeats: 1,
                            intensity: 'A orientar',
                            notes: '',
                          },
                        ],
                      })
                    }
                  >
                    Adicionar bloco
                  </Button>
                </fieldset>
              )}
              <div className="cardio-timeline" aria-label="Linha do tempo planejada">
                {draft.blocks.map((b) => (
                  <span key={b.id} style={{ flex: b.seconds * b.repeats }}>
                    {b.type} · {b.seconds * b.repeats}s
                  </span>
                ))}
              </div>
              <p role="status">
                Tempo total planejado: {clock(cardioSeconds(draft))}{' '}
                {draft.blocks.length ? `· ${draft.cycles} ciclos` : ''}
              </p>
              <Feedback error={error} />
              <Button type="submit">Salvar cardio na ficha</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
function CardioRunner({ cardio, workout }: { cardio: Cardio; workout: Workout }) {
  const data = useDemo(),
    repository = useRepository(),
    { studentId } = useDemoSession();
  const [reward, setReward] = useState<CompletionReward | null>(null);
  const [running, setRunning] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [stage, setStage] = useState(0),
    [stageStart, setStageStart] = useState(0),
    [seconds, setSeconds] = useState(''),
    [distance, setDistance] = useState(''),
    [rpe, setRpe] = useState(''),
    [notes, setNotes] = useState(''),
    [error, setError] = useState(''),
    [success, setSuccess] = useState('');
  const start = useRef(0),
    accumulated = useRef(0),
    recordId = useRef(uid());
  const stages = useMemo(() => cardioStages(cardio), [cardio]),
    current = stages[stage];
  const previous = (data.experience.cardioRecords ?? []).find(
    (r) => r.studentId === studentId && r.prescription.modality.id === cardio.modality.id,
  );
  useEffect(() => {
    if (!running) return;
    const tick = () => setElapsed((accumulated.current + performance.now() - start.current) / 1000);
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [running]);
  function pause() {
    if (running) {
      accumulated.current += performance.now() - start.current;
      setElapsed(accumulated.current / 1000);
      setRunning(false);
    }
  }
  return (
    <Panel className="module-panel cardio-runner">
      <p className="eyebrow">
        Cardio · {cardio.position} · {cardio.type}
      </p>
      <h2>{cardio.modality.name}</h2>
      <p>
        {clock(cardioSeconds(cardio))} planejados · {cardio.method}: {cardio.intensity}
      </p>
      {cardio.hrMin !== undefined && (
        <p>
          Faixa profissional: {cardio.hrMin}–{cardio.hrMax} bpm · monitor opcional
        </p>
      )}
      <p>{cardio.notes}</p>
      <p>
        {cardio.modality.parameters
          .filter((k) => cardio[k] !== undefined)
          .map((k) => `${parameterLabels[k]}: ${cardio[k]}`)
          .join(' · ')}
      </p>
      <p className="form-help">
        {previous
          ? `Último registro: ${previous.date} · ${clock(previous.seconds)}${previous.distance ? ` · ${previous.distance} km` : ''}`
          : 'Ainda sem registro anterior nesta modalidade.'}
      </p>
      <div className="cardio-clock-wrap">
        <svg className="cardio-orbit" viewBox="0 0 120 120" aria-hidden="true">
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            opacity=".15"
          />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={100 - Math.min(100, (elapsed / cardioSeconds(cardio)) * 100)}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div
          className="cardio-clock"
          role="timer"
          aria-live="off"
          aria-label="Tempo decorrido de cardio"
        >
          {clock(elapsed)}
        </div>
        <span className="cardio-clock-caption">
          {running ? 'Em andamento' : elapsed > 0 ? 'Pausado' : 'Pronto para começar'} ·{' '}
          {clock(cardioSeconds(cardio))} planejados
        </span>
      </div>
      <ol className="cardio-stage-rail" aria-label="Etapas da sessão">
        {stages.slice(Math.max(0, stage - 5), Math.max(0, stage - 5) + 12).map((s, offset) => {
          const index = offset + Math.max(0, stage - 5);
          return (
            <li
              key={`${s.id}-${index}`}
              aria-current={index === stage ? 'step' : undefined}
              data-complete={index < stage}
            >
              <span>{index < stage ? '✓' : index + 1}</span>
              {s.type}
            </li>
          );
        })}
      </ol>
      <p>
        Etapa {stage + 1}/{stages.length}: {current.type} · {current.intensity} ·{' '}
        {clock(Math.max(0, current.seconds - (elapsed - stageStart)))} restantes
      </p>
      <p>{current.notes}</p>
      <p>Próxima: {stages[stage + 1]?.type ?? 'Conclusão'}. A passagem de etapa é manual.</p>
      <div className="form-actions">
        <Button
          onClick={() => {
            if (running) pause();
            else {
              start.current = performance.now();
              setRunning(true);
              setSuccess('');
            }
          }}
        >
          {running ? 'Pausar cardio' : elapsed ? 'Retomar cardio' : 'Iniciar cardio'}
        </Button>
        <Button
          variant="outline"
          disabled={stage >= stages.length - 1}
          onClick={() => {
            setStageStart(elapsed);
            setStage(stage + 1);
          }}
        >
          Avançar etapa
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const actual = running
              ? (accumulated.current + performance.now() - start.current) / 1000
              : elapsed;
            pause();
            setSeconds(String(Math.max(1, Math.round(actual))));
          }}
        >
          Finalizar cardio
        </Button>
      </div>
      <p className="form-help">
        O tempo pausado não entra na duração. Você pode corrigir o registro antes de salvar.
        Recarregar reinicia o cronômetro em andamento.
      </p>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const before = repository.getSnapshot();
            saveCardioRecord(
              repository,
              {
                id: recordId.current,
                studentId,
                workoutId: workout.id,
                versionId: workout.versionId ?? '',
                prescription: structuredClone(cardio),
                date: civilDate(),
                seconds: Number(seconds),
                distance: distance ? Number(distance) : undefined,
                rpe: rpe ? Number(rpe) : undefined,
                notes,
              },
              studentId,
            );
            if (!workout.exercises.length)
              setReward(completionReward(before, repository.getSnapshot(), studentId, recordId.current));
            pause();
            setSuccess(
              'Cardio registrado. Consulte o histórico ou corrija os campos e salve novamente.',
            );
            setError('');
          } catch (err) {
            setError(errorMessage(err));
          }
        }}
      >
        <div className="form-grid">
          <Field label="Duração real (segundos)" htmlFor={`actual-${cardio.id}`}>
            <Input
              id={`actual-${cardio.id}`}
              type="number"
              min={1}
              max={86400}
              required
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
            />
          </Field>
          {cardio.modality.parameters.includes('distance') && (
            <Field label="Distância realizada (km)" htmlFor={`distance-${cardio.id}`}>
              <Input
                id={`distance-${cardio.id}`}
                type="number"
                min={0.01}
                max={1000}
                step="any"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
              />
            </Field>
          )}
          <Field label="Esforço percebido (RPE 0–10, opcional)" htmlFor={`rpe-${cardio.id}`}>
            <Input
              id={`rpe-${cardio.id}`}
              type="number"
              min={0}
              max={10}
              step="any"
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Observações da execução de cardio"
          htmlFor={`cardio-record-notes-${cardio.id}`}
        >
          <Textarea
            id={`cardio-record-notes-${cardio.id}`}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <Feedback error={error} success={success} />
        <Button type="submit">Salvar registro de cardio</Button>
      </form>
      {reward && <HabitCelebration key={reward.id} reward={reward} />}
    </Panel>
  );
}
export function CardioExecution({
  workout,
  position,
}: {
  workout: Workout;
  position: 'Antes' | 'Depois';
}) {
  return (
    <>
      {workout.cardio
        ?.filter((c) => (position === 'Antes' ? c.position === 'Antes' : c.position !== 'Antes'))
        .map((c) => (
          <CardioRunner key={c.id} cardio={c} workout={workout} />
        ))}
    </>
  );
}
export function CardioHistory({
  studentId,
  personal = false,
}: {
  studentId: string;
  personal?: boolean;
}) {
  const data = useDemo(),
    repository = useRepository();
  const [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [modality, setModality] = useState('all'),
    [error, setError] = useState('');
  const all = (data.experience.cardioRecords ?? []).filter((r) => r.studentId === studentId),
    records = all.filter(
      (r) =>
        (!from || r.date >= from) &&
        (!to || r.date <= to) &&
        (modality === 'all' || r.prescription.modality.id === modality),
    );
  const planned = data.workouts
    .filter(
      (w) =>
        w.studentId === studentId && (!from || w.updatedAt >= from) && (!to || w.updatedAt <= to),
    )
    .flatMap((w) => w.cardio ?? [])
    .filter((c) => modality === 'all' || c.modality.id === modality);
  return (
    <Panel className="module-panel section-gap cardio-history">
      <h2>{personal ? 'Acompanhamento de cardio' : 'Histórico de cardio'}</h2>
      <p className="form-help">
        Prescrições atribuídas no período e execuções registradas. Mais tempo ou intensidade não
        implica melhor desempenho. Sem cálculo de calorias.
      </p>
      <div className="form-grid">
        <Field label="Cardio desde" htmlFor="cardio-from">
          <Input
            id="cardio-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="Cardio até" htmlFor="cardio-to">
          <Input id="cardio-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Histórico por modalidade" htmlFor="cardio-history-modality">
          <select
            id="cardio-history-modality"
            className="native-select"
            value={modality}
            onChange={(e) => setModality(e.target.value)}
          >
            <option value="all">Todas as modalidades</option>
            {[
              ...new Map(
                [...CARDIO_CATALOG, ...all.map((r) => r.prescription.modality)].map((m) => [
                  m.id,
                  m,
                ]),
              ).values(),
            ].map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {from && to && from > to && <p role="alert">A data inicial deve anteceder a final.</p>}
      <div className="cardio-metrics">
        <span>
          Prescrições atribuídas<strong>{planned.length}</strong>
        </span>
        <span>
          Sessões realizadas<strong>{records.length}</strong>
        </span>
        <span>
          Minutos planejados por execução
          <strong>{(planned.reduce((n, c) => n + cardioSeconds(c), 0) / 60).toFixed(1)}</strong>
        </span>
        <span>
          Minutos realizados
          <strong>{(records.reduce((n, r) => n + r.seconds, 0) / 60).toFixed(1)}</strong>
        </span>
        <span>
          Dias com execução<strong>{new Set(records.map((r) => r.date)).size}</strong>
        </span>
      </div>
      <p className="form-help">
        A contagem planejada considera snapshots atribuídos, inclusive versões anteriores, e não
        equivale a um calendário de ocorrências. Frequência semanal é orientação da ficha.
      </p>
      {!records.length && <p>Nenhuma execução de cardio neste período.</p>}
      {records.map((r) => (
        <details key={r.id}>
          <summary>
            {r.date} · {r.prescription.modality.name} · {clock(r.seconds)}
          </summary>
          <p>
            Versão: {r.versionId} · planejado {clock(cardioSeconds(r.prescription))}
          </p>
          <p>
            {r.distance !== undefined ? `${r.distance} km` : 'Distância não registrada'} · RPE{' '}
            {r.rpe ?? 'não informado'}
          </p>
          <p>{r.notes}</p>
          {!personal && (
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const f = new FormData(e.currentTarget);
                  saveCardioRecord(
                    repository,
                    {
                      ...r,
                      seconds: Number(f.get('seconds')),
                      distance: f.get('distance') ? Number(f.get('distance')) : undefined,
                      rpe: f.get('rpe') ? Number(f.get('rpe')) : undefined,
                      notes: String(f.get('notes')),
                    },
                    studentId,
                  );
                  setError('Registro corrigido.');
                } catch (err) {
                  setError(errorMessage(err));
                }
              }}
            >
              <Field label="Corrigir duração (s)" htmlFor={`correct-seconds-${r.id}`}>
                <Input
                  id={`correct-seconds-${r.id}`}
                  name="seconds"
                  type="number"
                  min={1}
                  max={86400}
                  required
                  defaultValue={r.seconds}
                />
              </Field>
              {r.prescription.modality.parameters.includes('distance') && (
                <Field label="Corrigir distância (km)" htmlFor={`correct-distance-${r.id}`}>
                  <Input
                    id={`correct-distance-${r.id}`}
                    name="distance"
                    type="number"
                    min={0.01}
                    step="any"
                    defaultValue={r.distance}
                  />
                </Field>
              )}
              <Field label="Corrigir RPE (0–10)" htmlFor={`correct-rpe-${r.id}`}>
                <Input
                  id={`correct-rpe-${r.id}`}
                  name="rpe"
                  type="number"
                  min={0}
                  max={10}
                  step="any"
                  defaultValue={r.rpe}
                />
              </Field>
              <Field label="Corrigir observações" htmlFor={`correct-notes-${r.id}`}>
                <Textarea
                  id={`correct-notes-${r.id}`}
                  name="notes"
                  defaultValue={r.notes}
                  maxLength={1000}
                />
              </Field>
              <Button type="submit">Salvar correção de cardio</Button>
            </form>
          )}
        </details>
      ))}
      <p role="status">{error}</p>
      <div>
        <ol className="cardio-trend" aria-label="Evolução descritiva de duração e distância">
          {records
            .slice()
            .reverse()
            .map((r) => (
              <li key={r.id}>
                {r.date} · {r.prescription.modality.name}: {(r.seconds / 60).toFixed(1)} min
                {r.distance !== undefined ? ` · ${r.distance} km` : ''} · RPE {r.rpe ?? '—'}
              </li>
            ))}
        </ol>
      </div>
    </Panel>
  );
}
