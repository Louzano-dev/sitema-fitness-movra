import type { MovraRepository } from './repository';
import { programSchema, type Program } from '@/domain/experience';
import { studioCatalog } from '@/domain/exercise-catalog';
import { reviewReasons } from '@/domain/training-engine';
import { assessProgram } from '@/domain/training-plan';
export const newId = () => crypto.randomUUID();
export function saveProgram(repository: MovraRepository, input: Program): Program {
  const previous = repository.getSnapshot().experience.programs.find((p) => p.id === input.id);
  const parsed = programSchema.parse({
    ...input,
    id: input.id || newId(),
    status: 'Rascunho',
    approvedVersion: undefined,
    approvedAt: undefined,
    revision: previous ? previous.revision + 1 : 1,
    updatedAt: new Date().toISOString(),
  });
  if (!repository.getSnapshot().students.some((s) => s.id === parsed.studentId))
    throw new Error('Selecione um aluno existente.');
  repository.updateExperience((state) => ({
    ...state,
    programs: [parsed, ...state.programs.filter((p) => p.id !== parsed.id)],
  }));
  return parsed;
}
export function approveProgram(
  repository: MovraRepository,
  id: string,
  reviewed: boolean,
): Program {
  const state = repository.getSnapshot();
  const program = state.experience.programs.find((p) => p.id === id);
  if (!program || !reviewed) throw new Error('A revisão explícita do profissional é obrigatória.');
  if (new Set(program.days.map((day) => day.weekday)).size !== program.days.length)
    throw new Error('Organize os dias da semana sem duplicações antes de aprovar.');
  const { errors } = assessProgram(
    program.days,
    program.questionnaire,
    studioCatalog(state.exercises),
  );
  if (errors.length) throw new Error(errors.join(' '));
  const age = state.experience.ages[program.studentId];
  if (
    (age === undefined ||
      age < 18 ||
      (program.questionnaire && reviewReasons(program.questionnaire).length > 0)) &&
    !program.supervised
  )
    throw new Error('Este contexto exige planejamento manual supervisionado específico.');
  const approved = programSchema.parse({
    ...program,
    status: 'Aprovado',
    approvedVersion: `${id}.v${program.revision}.${Date.now()}`,
    approvedAt: new Date().toISOString(),
  });
  repository.updateExperience((state) => ({
    ...state,
    programs: state.programs.map((p) => (p.id === id ? approved : p)),
    versions: [structuredClone(approved), ...state.versions],
  }));
  return approved;
}
