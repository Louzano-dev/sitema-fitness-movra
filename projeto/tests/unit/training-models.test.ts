import { expect, it } from 'vitest';
import { EQUIPMENT, questionnaireSchema, type Questionnaire } from '@/domain/experience';
import { EXERCISES } from '@/domain/exercise-catalog';
import { planningById } from '@/domain/exercise-planning';
import { generateProgram } from '@/domain/training-engine';
import { assessProgram, estimateDay, movements } from '@/domain/training-plan';
import { modelFor, previewWeek, recommendModel, TRAINING_MODELS } from '@/domain/training-models';

const base: Questionnaire = {
  studentId:'ana', age:32, level:'Intermediário', experience:'Mais de um ano',
  goal:'Hipertrofia',frequency:3,minutes:45,days:['Segunda','Quarta','Sexta'],location:'Academia',
  coaching:'Presencial',equipment:[...EQUIPMENT],excluded:[],avoidPatterns:[],notes:'',
  specialContext:false,split:'Full body',
};
function example(id:string, overrides:Partial<Questionnaire>={}) {
  const model = TRAINING_MODELS.find((m) => m.id === id)!;
  const q = {...base,split:model.split,modelId:id,...overrides};
  const result = generateProgram(q);
  if (result.kind === 'review') throw Error(result.reasons.join(' '));
  return result.program;
}
it('mantém questionários v2 e distingue ABC por grupos, combinado e PPL', () => {
  const old = questionnaireSchema.parse({...base,split:'A/B/C'});
  expect(modelFor(old).id).toBe('ppl');
  const models = [
    ['abc-groups',['Peito','Costas','Pernas']],
    ['abc-combined',['Peito e tríceps','Costas e bíceps','Pernas e ombros']],
    ['ppl',['Empurrar','Puxar','Pernas']],
  ] as const;
  for (const [id, focus] of models) {
    const program = example(id);
    expect(previewWeek(program.questionnaire!).map((d) => d.focus)).toEqual(focus);
    for (const [i, day] of program.days.entries()) expect(day.name).toContain(focus[i]);
  }
  const abc = example('abc-groups');
  expect(abc.days[0].exercises.every((r) => planningById.get(r.exerciseId)?.primary === 'Peitoral')).toBe(true);
  expect(abc.days[1].exercises.every((r) => planningById.get(r.exerciseId)?.primary === 'Dorsais')).toBe(true);
  expect(assessProgram(abc.days,abc.questionnaire).warnings.join(' ')).toMatch(/menos de dois dias/);
  expect(example('abc-combined').days[2].exercises.some((r) => planningById.get(r.exerciseId)?.slot === 'ombros')).toBe(true);
});
it.each([
  ['full-ab',2,30,'Iniciante'],['full-abc',3,45,'Intermediário'],['full-emphasis',3,60,'Avançado'],
  ['upper-lower',4,45,'Intermediário'],['adapted-halves',5,60,'Avançado'],['movement',3,45,'Intermediário'],
  ['mobility',2,30,'Iniciante'],
] as const)('%s organiza a ficha dentro do tempo e dos padrões', (id,frequency,minutes,level) => {
  const days: Questionnaire['days'] = frequency === 2 ? ['Terça','Sexta'] : frequency === 3 ? base.days
      : frequency === 4 ? ['Segunda','Terça','Quinta','Sexta'] : ['Segunda','Terça','Quarta','Quinta','Sexta'];
  const p = example(id,{frequency,minutes,level,days,excluded:['supino']});
  const assessment = assessProgram(p.days,p.questionnaire);
  expect(assessment.errors).toEqual([]);
  expect(assessment.warnings.filter((w) => w.includes('cobertura incompleta'))).toEqual([]);
  for (const day of p.days) {
    expect(estimateDay(day).minutes).toBeLessThanOrEqual(minutes);
    const moves = day.exercises.map((r) => planningById.get(r.exerciseId)!);
    expect(new Set(moves.map((m) => m.family)).size).toBe(moves.length);
    if (id.startsWith('full-')) {
      const roles = moves.filter((m) => m.compound).map((m) => m.slot);
      expect(roles).toContain('peito'); expect(roles).toContain('costas');
      expect(roles.some((s) => ['joelho','quadril'].includes(s))).toBe(true);
    }
    for (const row of day.exercises) {
      expect(row.exerciseId).not.toBe('supino');
      expect(row.reps).toBeGreaterThan(0); expect(row.sets).toBeGreaterThan(0);
    }
  }
  if (id === 'adapted-halves') expect(p.days[4].name).toContain('Corpo inteiro');
});
it('não aceita cobertura parcial do Full Body e separa as verificações após edições', () => {
  expect(generateProgram({...base,equipment:['Peso corporal'],location:'Casa'}).kind).toBe('review');
  const q = {...base,location:'Casa',equipment:['Peso corporal','Elásticos']} as Questionnaire;
  const p = example('full-abc',q);
  const day = p.days[0];
  const row = {...day.exercises[0],sets:10,rest:600};
  const audit = assessProgram([{...day,exercises:[row]}, {...p.days[1],exercises:[row,{...row,id:'outra'}]}],
    {...q,excluded:[row.exerciseId]});
  expect(audit.errors.join(' ')).toMatch(/exclusões/);
  expect(audit.errors.join(' ')).toMatch(/duração/);
  expect(audit.warnings.join(' ')).toMatch(/único exercício/);
  expect(audit.warnings.join(' ')).toMatch(/cobertura incompleta/);
  expect(audit.warnings.join(' ')).toMatch(/repetição/);
  expect(audit.warnings.join(' ')).toMatch(/menos de dois dias/);
});
it('exige grupos personalizados, inclusive com objetivo geral de mobilidade', () => {
  const dayGroups = {Segunda:['Glúteos','Core'],Quarta:['Dorsais','Bíceps'],Sexta:['Mobilidade']};
  const p = example('custom',{dayGroups,goal:'Mobilidade'});
  for (const day of p.days) {
    const primary = [...new Set(day.exercises.map((r) => planningById.get(r.exerciseId)?.primary))];
    expect(primary.sort()).toEqual([...dayGroups[day.weekday as keyof typeof dayGroups]].sort());
  }
  expect(generateProgram({...base,split:'Personalizada',modelId:'custom'}).kind).toBe('review');
  const targeted = example('full-abc',{dayGroups:{Quarta:['Dorsais','Bíceps']}});
  expect(targeted.days[0].name).toContain('Corpo inteiro A');
  expect(targeted.days[1].name).toContain('Dorsais e Bíceps');
  expect(targeted.days[2].name).toContain('Corpo inteiro C');
});
it('mantém a prescrição e a seleção auditáveis', () => {
  expect(movements.length).toBe(planningById.size);
  expect(new Set(movements.map((e) => e.id)).size).toBe(movements.length);
  for (const e of movements) {
    expect(e.primary && e.family && e.instructions && e.reviewStatus && e.requires.length).toBeTruthy();
    expect(e.alternatives.every((id) => EXERCISES.some((x) => x.id === id))).toBe(true);
  }
  expect(recommendModel(base).id).toBe('full-abc');
  expect(recommendModel({...base,frequency:2,days:['Domingo','Segunda']}).id).toBe('upper-lower');
  const p = example('full-abc',{days:['Segunda','Terça','Quarta']});
  expect(assessProgram(p.days,p.questionnaire).warnings.join(' ')).toMatch(/recuperação/);
});
it('gera exemplos verificáveis para a revisão do personal', () => {
  const programs = [example('full-abc'),example('abc-groups'),example('custom',{
    dayGroups:{Segunda:['Glúteos','Core'],Quarta:['Dorsais','Bíceps'],Sexta:['Mobilidade']},
  })];
  for (const p of programs) {
    expect(assessProgram(p.days,p.questionnaire).errors).toEqual([]);
    if (process.env.MOVRA_PRINT_EXAMPLES) console.info(p.questionnaire?.modelId, p.days.map((d) => ({
      day:d.weekday,focus:d.name,exercises:d.exercises.map((r) => EXERCISES.find((e) => e.id === r.exerciseId)?.name),
      sets:estimateDay(d).sets,estimate:estimateDay(d).minutes,
    })));
  }
});
