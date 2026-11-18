import {
  questionnaireSchema,
  WEEKDAYS,
  type Questionnaire,
  type TrainingDay,
  type Program,
} from './experience';
import { GENERATOR_EXERCISES } from './exercise-catalog';
import { CARDIO_CATALOG, makeCardio } from './cardio';
import { normalize } from './selectors';
export const RULE_VERSION = 'movra-rules/1.0';
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
    /dor|lesao|gravidez|gesta|clinica|cirurgia|cardiac|desmaio|limitacao|hipertens|diabet|asma|epilep|cancer|oncolog|artrit|tendinit|fratur|osteopor/.test(
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
export function generateProgram(raw: Questionnaire, offset = 0): Proposal {
  const q = questionnaireSchema.parse(raw);
  const reasons = reviewReasons(q);
  const cq = q.cardio;
  if (cq?.include === 'Sim' && (cq.frequency > q.frequency || cq.minutes > q.minutes - 8))
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
  if (reasons.length) return { kind: 'review', reasons };
  const pool = GENERATOR_EXERCISES.filter(
    (e) =>
      e.requires.every((r) => q.equipment.includes(r as (typeof q.equipment)[number])) &&
      !q.excluded.includes(e.id) &&
      !q.avoidPatterns.includes(e.pattern),
  );
  if (!pool.length)
    return {
      kind: 'review',
      reasons: [
        'Nenhum exercício compatível com os equipamentos e exclusões. Amplie o catálogo ou monte manualmente.',
      ],
    };
  const days: TrainingDay[] = WEEKDAYS.filter((day) => q.days.includes(day)).map(
    (weekday, index) => {
      let compatible = pool;
      if (q.goal === 'Mobilidade') compatible = pool.filter((e) => e.category === 'Mobilidade');
      else if (q.split === 'Superior/inferior')
        compatible = pool.filter(
          (e) => e.group === (index % 2 ? 'Membros inferiores' : 'Membros superiores'),
        );
      else if (q.split === 'A/B/C')
        compatible = pool.filter((e) =>
          index % 3 === 0
            ? e.pattern === 'Empurrar'
            : index % 3 === 1
              ? e.pattern === 'Puxar'
              : e.group === 'Membros inferiores',
        );
      else if (q.split === 'A/B')
        compatible = pool.filter((e) =>
          index % 2
            ? ['Puxar', 'Quadril', 'Core', 'Mobilidade'].includes(e.pattern)
            : ['Agachar', 'Empurrar', 'Elevar', 'Tornozelo'].includes(e.pattern),
        );
      else if (q.split === 'Padrões de movimento')
        compatible = pool.filter((e) =>
          index % 2
            ? ['Puxar', 'Quadril', 'Core'].includes(e.pattern)
            : ['Agachar', 'Empurrar', 'Mobilidade'].includes(e.pattern),
        );
      const ordered = [
        ...compatible.slice(offset % Math.max(1, compatible.length)),
        ...compatible.slice(0, offset % Math.max(1, compatible.length)),
      ];
      if (q.goal === 'Condicionamento físico')
        ordered.sort(
          (a, b) =>
            Number(b.category === 'Condicionamento') - Number(a.category === 'Condicionamento'),
        );
      // Interleave movement patterns deterministically rather than selecting at random.
      const patterns = [...new Set(ordered.map((e) => e.pattern))];
      const selected = patterns
        .map((pattern) => ordered.find((e) => e.pattern === pattern)!)
        .slice(
          0,
          Math.max(
            1,
            Math.min(
              5,
              Math.floor(
                (q.minutes - (cq?.include === 'Sim' && index < cq.frequency ? cq.minutes : 0)) / 8,
              ),
            ),
          ),
        );
      return {
        id: `day-${index}`,
        cardio:
          cq?.include === 'Sim' && modality && index < cq.frequency
            ? [
                {
                  ...makeCardio(modality),
                  id: `cardio-proposal-${index}`,
                  minutes: cq.minutes,
                  frequency: cq.frequency,
                  notes: `Objetivo: ${cq.goal}. Experiência: ${cq.experience}. ${cq.notes} Revisar distribuição e recuperação.`,
                  intensity: 'A definir após avaliação profissional; sem intensidade automática',
                },
              ]
            : undefined,
        name: `${String.fromCharCode(65 + index)} · ${q.split}`,
        weekday,
        instructions: q.notes,
        exercises: selected.map((e, i) => ({
          id: `row-${index}-${i}`,
          exerciseId: e.id,
          sets:
            q.level === 'Iniciante' ||
            q.goal === 'Manutenção da atividade física' ||
            q.goal === 'Mobilidade'
              ? 2
              : 3,
          reps: q.goal === 'Força' ? 6 : q.goal === 'Resistência muscular' ? 15 : 10,
          repsMax: q.goal === 'Força' ? 8 : undefined,
          rest: q.goal === 'Força' ? 120 : 60,
          notes: 'Proposta de organização: revisar técnica, volume e parâmetros.',
          locked: false,
        })),
      };
    },
  );
  if (days.some((day) => !day.exercises.length))
    return {
      kind: 'review',
      reasons: [
        'A divisão escolhida não possui exercícios compatíveis em todos os dias. Mude a divisão ou revise manualmente.',
      ],
    };
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
        `Parâmetros demonstrativos editáveis; exigem avaliação e aprovação do personal.`,
      ],
      revision: 1,
      updatedAt: '',
      template: false,
      supervised: false,
    },
  };
}
