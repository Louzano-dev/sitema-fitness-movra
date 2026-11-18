import {
  questionnaireSchema,
  WEEKDAYS,
  type Questionnaire,
  type TrainingDay,
  type Program,
} from './experience';
import { dayFocus, estimateDay, selectDay, weekVolume, type PlanContext } from './training-plan';
import { EXERCISES } from './exercise-catalog';
import { CARDIO_CATALOG, makeCardio } from './cardio';
import { normalize } from './selectors';
export const RULE_VERSION = 'movra-rules/2.0';
export function reviewReasons(input: Questionnaire): string[] {
  const reasons: string[] = [];
  if (input.age >= 65)
    reasons.push(
      'Para esta faixa etária, o protótipo exige planejamento individual revisado, sem aplicar automaticamente o modelo adulto.',
    );
  if (input.age < 18)
    reasons.push(
      'Menor de idade: usar planejamento supervisionado específico. Nenhum modelo adulto foi gerado.',
    );
  if (
    input.specialContext ||
    /\bdor(?:es)?\b|lesao|gravidez|gesta|clinica|cirurgia|cardiac|desmaio|limitacao|hipertens|diabet|asma|epilep|cancer|oncolog|artrit|tendinit|fratur|osteopor/.test(
      normalize(input.notes + ' ' + (input.cardio?.notes ?? '')),
    )
  )
    reasons.push('Contexto individual exige avaliação profissional antes de elaborar a ficha.');
  if (input.level !== 'Iniciante' && input.experience === 'Sem experiência')
    reasons.push('Nível e experiência são incoerentes. Revise o questionário.');
  if (input.frequency > 4 && input.level === 'Iniciante')
    reasons.push('Frequência alta para este modelo inicial. Planejamento individual obrigatório.');
  if (input.frequency > 5)
    reasons.push(
      'Frequências de seis ou sete dias exigem organização individual de recuperação; sem geração automática.',
    );
  return reasons;
}
export type Proposal =
  { kind: 'review'; reasons: string[] } | { kind: 'proposal'; program: Program };
export function generateProgram(
  raw: Questionnaire,
  offset = 0,
  context: PlanContext = {},
): Proposal {
  const q = questionnaireSchema.parse(raw);
  const reasons = reviewReasons(q);
  const cq = q.cardio;
  if (cq?.include === 'Sim' && (cq.frequency > q.frequency || cq.minutes >= q.minutes))
    reasons.push(
      'Cardio excede os dias ou o tempo disponível da sessão. Revise a distribuição e recuperação.',
    );
  const modality = cq?.modalities
    .map((id) => CARDIO_CATALOG.find((m) => m.id === id))
    .find(
      (m) =>
        m &&
        (m.id === 'cardio-2' ||
          m.id === 'cardio-3' ||
          m.id === 'cardio-11' ||
          m.id === 'cardio-13' ||
          ((m.id === 'cardio-0' || m.id === 'cardio-1') && q.equipment.includes('Esteira')) ||
          (m.id === 'cardio-4' && q.equipment.includes('Bicicleta ergométrica'))),
    );
  if (cq?.include === 'Sim' && !modality)
    reasons.push(
      'Selecione uma modalidade compatível com os equipamentos. Outras modalidades exigem organização manual.',
    );
  if ((q.split === 'A/B/C' || q.split === 'Push/Pull/Legs') && q.frequency < 3)
    reasons.push(
      'Esta divisão precisa de pelo menos três dias para contemplar a semana. Escolha corpo inteiro ou aumente a disponibilidade.',
    );
  if (q.split === 'Personalizada' && q.days.some((d) => !q.dayFocus?.[d]))
    reasons.push('Escolha o foco de cada dia da divisão personalizada.');
  if (reasons.length) return { kind: 'review', reasons };
  const days: TrainingDay[] = [];
  for (const weekday of WEEKDAYS.filter((d) => q.days.includes(d))) {
    const index = days.length;
    const focus = dayFocus(q, index, weekday);
    const day: TrainingDay = {
      id: `day-${index}`,
      name: `${String.fromCharCode(65 + index)} · ${focus}`,
      weekday,
      exercises: [],
      instructions: q.notes,
      cardio:
        cq?.include === 'Sim' && modality && index < cq.frequency
          ? [
              {
                ...makeCardio(modality, `cardio-proposal-${index}`),
                minutes: cq.minutes,
                frequency: cq.frequency,
                notes: [cq.goal, cq.experience, cq.notes].filter(Boolean).join(' · '),
                intensity: 'A definir após avaliação profissional; sem intensidade automática',
              },
            ]
          : undefined,
    };
    const { selected, minimum, covered } = selectDay(q, day, index, days, offset, context);
    if (!covered || selected.length < minimum)
      return {
        kind: 'review',
        reasons: [
          `${weekday} · ${focus}: cabem ${selected.length} exercícios compatíveis com os equipamentos, exclusões e tempo após o cardio. Ajuste a divisão, os equipamentos ou os minutos e gere novamente.`,
        ],
      };
    days.push({ ...day, exercises: selected });
  }
  return {
    kind: 'proposal',
    program: {
      id: '',
      title: `Proposta · ${q.goal}`,
      studentId: q.studentId,
      questionnaire: q,
      ruleVersion: RULE_VERSION,
      status: 'Aguardando revisão',
      days,
      rationale: [
        `Modelo ${RULE_VERSION}; ${q.level.toLowerCase()} com experiência ${q.experience.toLowerCase()}.`,
        `${q.frequency} dias × ${q.minutes} min como limite de organização, sem promessa de duração exata.`,
        `Divisão ${q.split}; equipamentos e exclusões respeitados. Cargas não inferidas.`,
        `Idade ${q.age} registrada para triagem; não determina nível ou segurança.`,
        q.level === 'Iniciante'
          ? 'Priorize familiarização. Revise a execução antes de alterar as repetições.'
          : q.level === 'Intermediário'
            ? 'Acompanhe as repetições nas sessões seguintes. Revise o volume antes de progredir.'
            : 'Compare as sessões do bloco e revise esforço e recuperação antes de progredir. O personal pode registrar RIR ou RPE nos campos opcionais.',
        `Local: ${q.location}. Confira os apoios e os equipamentos específicos disponíveis.`,
        `Volume direto estimado: ${Object.entries(weekVolume(days))
          .map(([m, n]) => m + ' ' + n + ' séries')
          .join(', ')}.`,
      ],
      revision: 1,
      updatedAt: '',
      template: false,
      supervised: false,
    },
  };
}

export function regenerateDays(
  draft: Program,
  dayId: string | undefined,
  offset: number,
  context: PlanContext = {},
): Program {
  const q = draft.questionnaire;
  if (!q) throw Error('Esta ficha manual precisa ser ajustada pela biblioteca.');
  const reasons = reviewReasons(q);
  if (reasons.length) throw Error(reasons.join(' '));
  const days: TrainingDay[] = [];
  for (const [index, day] of draft.days.entries()) {
    if (dayId && day.id !== dayId) {
      days.push(day);
      continue;
    }
    const locked = day.exercises.filter((e) => e.locked);
    for (const row of locked) {
      const exercise = EXERCISES.find((e) => e.id === row.exerciseId);
      if (
        q.excluded.includes(row.exerciseId) ||
        (exercise &&
          (q.avoidPatterns.includes(exercise.pattern) ||
            !exercise.requires.every((part) => q.equipment.some((item) => item === part))))
      ) {
        throw Error(
          day.weekday +
            ': um exercício preservado conflita com os equipamentos ou as exclusões. Revise a linha antes de regenerar.',
        );
      }
    }
    const base = { ...day, exercises: locked };
    if (estimateDay(base).minutes > q.minutes)
      throw Error(
        day.weekday +
          ': os itens preservados e o cardio já excedem o tempo. Ajuste a duração antes de regenerar.',
      );
    const result = selectDay(
      q,
      base,
      index,
      dayId ? draft.days.filter((d) => d.id !== day.id) : days,
      offset,
      context,
    );
    if (!result.covered || result.selected.length < result.minimum)
      throw Error(day.weekday + ': amplie o tempo ou ajuste os equipamentos e as exclusões.');
    days.push({ ...day, exercises: result.selected });
  }
  return { ...draft, days, ruleVersion: RULE_VERSION };
}
