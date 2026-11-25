import { WEEKDAYS, type Questionnaire } from './experience';

export const muscles = {
  joelho: 'Quadríceps', quadril: 'Glúteos', posterior: 'Posteriores de coxa',
  peito: 'Peitoral', costas: 'Dorsais', ombros: 'Ombros', bíceps: 'Bíceps',
  tríceps: 'Tríceps', panturrilha: 'Panturrilhas', core: 'Core', mobilidade: 'Mobilidade',
} as const;
export const TRAINING_GROUPS = Object.values(muscles);
export type Slot = keyof typeof muscles;
type Weekday = Questionnaire['days'][number];

export interface SessionPlan {
  focus: string;
  // Each band requires a distinct planning role. Later roles complement the session.
  required: Slot[][];
  slots: Slot[];
  fullBody?: boolean;
  groups?: string[];
}
function session(focus: string, required: Slot[][], slots: Slot[]): SessionPlan {
  return { focus, required, slots };
}
function fullBody(letter: string, lower: 'joelho' | 'quadril', extra: Slot[], emphasis = ''): SessionPlan {
  const other = lower === 'joelho' ? 'quadril' : 'joelho';
  const upper: Slot[] = letter === 'B' ? ['costas', 'peito'] : ['peito', 'costas'];
  return {
    fullBody: true, focus: `Corpo inteiro ${letter}${emphasis}`,
    required: [[lower, other], ...upper.map((s) => [s])],
    slots: [other, ...extra],
  };
}
const a = fullBody('A', 'joelho', ['core', 'ombros', 'panturrilha']);
const b = fullBody('B', 'quadril', ['ombros', 'posterior', 'core']);
const c = fullBody('C', 'joelho', ['posterior', 'panturrilha', 'core']);
const upper = session('Superior', [['peito'], ['costas']], ['ombros', 'costas', 'peito', 'tríceps', 'bíceps']);
const lower = session('Inferior', [['joelho'], ['quadril', 'posterior']], ['posterior', 'panturrilha', 'core', 'joelho']);
const push = session('Empurrar', [['peito'], ['ombros']], ['tríceps', 'peito', 'ombros', 'core']);
const pull = session('Puxar', [['costas']], ['costas', 'bíceps', 'costas', 'core', 'bíceps']);
const mobility = session('Mobilidade', [['mobilidade']], Array<Slot>(5).fill('mobilidade'));

export interface TrainingModel {
  id: string;
  name: string;
  category: string;
  description: string;
  frequencies: number[];
  split: Questionnaire['split'];
  secondary: boolean;
  version: number;
  days: SessionPlan[];
  requirements: string;
  limitations: string;
}
function model(id: string, name: string, category: string, split: TrainingModel['split'],
  description: string, frequencies: number[], days: SessionPlan[], limitations: string, secondary = false): TrainingModel {
  return { id, name, category, split, description, frequencies, days, limitations, secondary,
    version: 1, requirements: 'Equipamentos compatíveis e tempo para os focos do dia.' };
}
const body = 'Corpo inteiro', groups = 'Por grupos musculares', halves = 'Superior e inferior';
export const TRAINING_MODELS: TrainingModel[] = [
  model('full-ab', 'Full Body A/B', body, 'A/B', 'Alterne duas sessões que trabalham o corpo inteiro.', [2,3,4], [a,b], 'Revise a recuperação em dias consecutivos.'),
  model('full-abc', 'Full Body A/B/C', body, 'Full body', 'Distribua movimentos complementares por três sessões.', [3,4,5], [a,b,c], 'A terceira sessão pressupõe três dias disponíveis.'),
  model('full-emphasis', 'Full Body com ênfase', body, 'Full body', 'Mantenha o corpo inteiro e alterne o foco de cada dia.', [1,2,3,4,5],
    [fullBody('A','joelho',['joelho','core','ombros'],' · ênfase em joelho'),
     fullBody('B','quadril',['quadril','posterior','core'],' · ênfase em quadril'),
     fullBody('C','joelho',['costas','ombros','core'],' · ênfase em superiores')], 'Um único dia limita a frequência semanal.'),
  model('abc-groups', 'ABC por grupos', groups, 'A/B/C', 'Dedique um dia a peito, outro a costas e outro a pernas.', [3,4,5],
    [session('Peito',[['peito']],['peito','peito','peito']),session('Costas',[['costas']],['costas','costas','costas']),{...lower, focus:'Pernas', slots:['posterior','panturrilha','joelho','quadril']}],
    'Ombros e braços podem receber pouco trabalho direto.'),
  model('abc-combined', 'ABC combinado', groups, 'A/B/C', 'Combine peito e tríceps, costas e bíceps, pernas e ombros.', [3,4,5],
    [session('Peito e tríceps',[['peito'],['tríceps']],['peito','tríceps','peito']),
     session('Costas e bíceps',[['costas'],['bíceps']],['costas','bíceps','costas']),
     session('Pernas e ombros',[['joelho'],['quadril','posterior'],['ombros']],['posterior','panturrilha','ombros'])],
    'Em três dias, cada combinação aparece uma vez.'),
  model('ppl', 'Push/Pull/Legs', groups, 'Push/Pull/Legs', 'Organize os dias por empurrar, puxar e treinar pernas.', [3,4,5],
    [push,pull,{...lower, focus:'Pernas'}], 'Confira a frequência dos padrões ao repetir a sequência.'),
  model('upper-lower', 'Upper/Lower', halves, 'Upper/Lower', 'Alterne membros superiores e inferiores.', [2,3,4,5],
    [upper,lower], 'Uma semana ímpar distribui os focos de forma desigual.'),
  model('adapted-halves', 'Superior/inferior adaptado', halves, 'Superior/inferior', 'Combine superiores e inferiores com uma sessão mista em semanas ímpares.', [2,3,4,5],
    [upper,lower], 'Revise a ordem conforme os intervalos entre treinos.'),
  model('movement', 'Padrões de movimento', 'Outros modelos', 'Padrões de movimento', 'Organize por padrões complementares de movimento.', [2,3,4,5],
    [session('Agachar e empurrar',[['joelho'],['peito']],['ombros','joelho','tríceps']),
     session('Quadril e puxar',[['quadril'],['costas']],['posterior','costas','bíceps']),c],
    'Verifique os padrões contemplados na semana.', true),
  model('mobility', 'Mobilidade', 'Outros modelos', 'Padrões de movimento', 'Organize movimentos de mobilidade sem prescrever carga.', [1,2,3,4,5],
    [mobility], 'Não substitui um programa de força.', true),
  model('custom', 'Personalizada', 'Outros modelos', 'Personalizada', 'Escolha o foco ou os grupos de cada dia.', [1,2,3,4,5],
    [], 'Os focos são definidos pelo personal.', true),
];
const byId = new Map(TRAINING_MODELS.map((m) => [m.id,m]));
export function recommendModel(q: Questionnaire) {
  if (q.goal === 'Mobilidade') return byId.get('mobility')!;
  if (q.frequency === 1) return byId.get('full-emphasis')!;
  const consecutivePair = q.frequency === 2 && q.days.some((day) =>
    q.days.includes(WEEKDAYS[(WEEKDAYS.indexOf(day)+1)%7]));
  if (consecutivePair) return byId.get('upper-lower')!;
  if (q.frequency <= 3) return byId.get(q.frequency === 3 ? 'full-abc' : 'full-ab')!;
  return byId.get(q.frequency % 2 ? 'adapted-halves' : 'upper-lower')!;
}
export function modelFor(q: Questionnaire): TrainingModel {
  const chosen = q.modelId && byId.get(q.modelId);
  if (chosen) return chosen;
  if (q.split === 'Personalizada') return byId.get('custom')!;
  if (q.goal === 'Mobilidade') return byId.get('mobility')!;
  // Old A/B/C proposals used push/pull/legs. Retain their meaning on regeneration.
  const legacy: Record<Questionnaire['split'], string> = {
    'A/B/C':'ppl', 'Push/Pull/Legs':'ppl', 'Personalizada':'custom',
    'A/B': q.level === 'Iniciante' ? 'full-ab' : 'upper-lower',
    'Full body': q.frequency === 1 ? 'full-emphasis' : q.frequency === 2 ? 'full-ab' : 'full-abc',
    'Upper/Lower':'upper-lower','Superior/inferior':'adapted-halves','Padrões de movimento':'movement',
  };
  return byId.get(legacy[q.split])!;
}
const customFocus = { 'Corpo inteiro': a, Superior:upper, Inferior:lower, Empurrar:push, Puxar:pull, Mobilidade:mobility };
export function sessionPlan(q: Questionnaire, index: number, weekday: Weekday): SessionPlan {
  const m = modelFor(q);
  if (m.id === 'custom' || (q.modelId && (q.dayGroups?.[weekday]?.length || q.dayFocus?.[weekday]))) {
    const groups = q.dayGroups?.[weekday];
    if (groups?.length) {
      const roles = (Object.keys(muscles) as Slot[]).filter((s) => groups.includes(muscles[s]));
      return { ...session(groups.join(' e '),roles.map((s) => [s]), roles), groups };
    }
    const focus = q.dayFocus?.[weekday] ?? 'Corpo inteiro';
    return { ...customFocus[focus], focus };
  }
  if (m.id === 'adapted-halves' && q.frequency % 2 && index === q.frequency - 1) return c;
  return m.days[index % m.days.length];
}
export function previewWeek(q: Questionnaire) {
  return WEEKDAYS.filter((d) => q.days.includes(d)).map((weekday,index) => ({
    weekday, focus: sessionPlan(q,index,weekday).focus,
  }));
}
