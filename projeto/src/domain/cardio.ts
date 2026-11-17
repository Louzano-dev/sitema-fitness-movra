import { z } from 'zod';
export const CARDIO_TYPES = [
  'Contínuo',
  'Intervalado',
  'Progressivo',
  'Livre',
  'Personalizado',
] as const;
export const modalitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(100),
  equipment: z.string().min(2).max(120),
  description: z.string().min(2).max(500),
  parameters: z.array(z.enum(['distance', 'speed', 'incline', 'resistance', 'cadence'])),
  alternatives: z.array(z.string()),
});
export type CardioModality = z.infer<typeof modalitySchema>;
const names = [
  'Caminhada na esteira',
  'Corrida na esteira',
  'Caminhada ao ar livre',
  'Corrida ao ar livre',
  'Bicicleta ergométrica',
  'Bicicleta ao ar livre',
  'Bicicleta de spinning',
  'Elíptico',
  'Escada ergométrica',
  'Simulador de remo',
  'Natação',
  'Dança aeróbica',
  'Caminhada em subida',
  'Circuito aeróbico',
];
export const CARDIO_CATALOG: CardioModality[] = names.map((name, i) => ({
  id: `cardio-${i}`,
  name,
  equipment:
    i < 2
      ? 'Esteira'
      : i === 4
        ? 'Bicicleta ergométrica'
        : i === 5
          ? 'Bicicleta e local apropriado'
          : i === 6
            ? 'Bicicleta de spinning'
            : i === 7
              ? 'Elíptico'
              : i === 8
                ? 'Escada ergométrica'
                : i === 9
                  ? 'Remo ergométrico'
                  : i === 10
                    ? 'Piscina e supervisão apropriada'
                    : 'Espaço apropriado',
  description: `${name}. Modalidade demonstrativa; técnica, contexto e parâmetros devem ser orientados pelo profissional. Não há mídia cadastrada.`,
  parameters:
    i < 2
      ? ['distance', 'speed', 'incline']
      : i >= 4 && i <= 7
        ? ['distance', 'resistance', 'cadence']
        : i === 9
          ? ['distance', 'resistance', 'cadence']
          : i === 2 || i === 3 || i === 10 || i === 12
            ? ['distance']
            : [],
  alternatives:
    i < 2 ? ['Caminhada ao ar livre'] : i >= 4 && i <= 7 ? ['Bicicleta ergométrica'] : [],
}));
export const blockSchema = z.object({
  id: z.string(),
  type: z.enum(['Aquecimento', 'Esforço', 'Recuperação', 'Desaquecimento']),
  seconds: z.number().int().min(1).max(7200),
  repeats: z.number().int().min(1).max(100),
  intensity: z.string().min(1).max(150),
  notes: z.string().max(500),
});
export const cardioSchema = z
  .object({
    id: z.string(),
    modality: modalitySchema,
    type: z.enum(CARDIO_TYPES),
    position: z.enum(['Antes', 'Depois', 'Independente']),
    minutes: z.number().positive().max(240),
    frequency: z.number().int().min(1).max(7),
    method: z.enum([
      'Descrição qualitativa',
      'RPE',
      'Teste da fala',
      'Faixa cardíaca profissional',
    ]),
    intensity: z.string().min(1).max(150),
    hrMin: z.number().int().min(30).max(240).optional(),
    hrMax: z.number().int().min(30).max(240).optional(),
    distance: z.number().positive().max(1000).optional(),
    speed: z.number().positive().max(100).optional(),
    incline: z.number().min(0).max(50).optional(),
    resistance: z.number().min(0).max(1000).optional(),
    cadence: z.number().positive().max(300).optional(),
    notes: z.string().max(1000),
    cycles: z.number().int().min(1).max(100),
    blocks: z.array(blockSchema).max(30),
  })
  .superRefine((s, ctx) => {
    if (['Intervalado', 'Progressivo', 'Personalizado'].includes(s.type) && !s.blocks.length)
      ctx.addIssue({ code: 'custom', message: 'Adicione ao menos um bloco.' });
    if (
      s.type === 'Intervalado' &&
      (!s.blocks.some((b) => b.type === 'Esforço') ||
        !s.blocks.some((b) => b.type === 'Recuperação'))
    )
      ctx.addIssue({ code: 'custom', message: 'Intervalado precisa de esforço e recuperação.' });
    if (
      s.method === 'Faixa cardíaca profissional' &&
      (s.hrMin === undefined || s.hrMax === undefined || s.hrMin > s.hrMax)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Informe uma faixa cardíaca profissional coerente.',
      });
    if (s.blocks.length && cardioSeconds(s) > 14400)
      ctx.addIssue({ code: 'custom', message: 'A sessão deve ter no máximo 240 minutos.' });
  });
export type Cardio = z.infer<typeof cardioSchema>;
export function cardioSeconds(s: Pick<Cardio, 'blocks' | 'cycles' | 'minutes'>) {
  return s.blocks.length
    ? s.blocks.reduce((sum, b) => sum + b.seconds * b.repeats, 0) * s.cycles
    : s.minutes * 60;
}
export function cardioStages(s: Cardio) {
  return s.blocks.length
    ? Array.from({ length: s.cycles }, () =>
        s.blocks.flatMap((b) => Array.from({ length: b.repeats }, () => b)),
      ).flat()
    : [{ id: s.id, type: s.type, seconds: s.minutes * 60, intensity: s.intensity, notes: s.notes }];
}
export const cardioRecordSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  workoutId: z.string(),
  versionId: z.string(),
  prescription: cardioSchema,
  date: z.iso.date(),
  seconds: z.number().positive().max(86400),
  distance: z.number().positive().max(1000).optional(),
  rpe: z.number().min(0).max(10).optional(),
  notes: z.string().max(1000),
});
export type CardioRecord = z.infer<typeof cardioRecordSchema>;
export const cardioQuestionSchema = z.object({
  include: z.enum(['Sim', 'Não', 'Deixar o profissional decidir']),
  goal: z.string().max(150),
  modalities: z.array(z.string()),
  frequency: z.number().int().min(1).max(7),
  minutes: z.number().int().min(1).max(120),
  experience: z.string().max(150),
  notes: z.string().max(500),
});
export function makeCardio(modality = CARDIO_CATALOG[0]): Cardio {
  return {
    id: crypto.randomUUID(),
    modality: structuredClone(modality),
    type: 'Contínuo',
    position: 'Depois',
    minutes: 10,
    frequency: 1,
    method: 'Descrição qualitativa',
    intensity: 'A definir e revisar pelo profissional',
    notes: '',
    cycles: 1,
    blocks: [],
  };
}
