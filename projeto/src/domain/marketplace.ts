import { z } from 'zod';

export const FREE_ACTIVE_STUDENT_LIMIT = 10;
export const MARKET_COMMISSION_PERCENT = 10;
export const retentionTerms =
  'As fichas personalizadas entregues e seu histórico continuam na biblioteca para uso individual. Modelos do profissional e materiais de terceiros mantêm suas licenças. O encerramento interrompe os serviços futuros.';
export const serviceModes = ['Somente treino', 'Com agendamento', 'Híbrido'] as const;
export const modalities = ['Online', 'Presencial', 'Online e presencial'] as const;
const short = z.string().trim().max(140);
const paragraph = z.string().trim().max(1500);
export const profileSchema = z.object({
  name: short.min(2),
  bio: paragraph,
  education: paragraph,
  experience: paragraph,
  specialties: short.min(2),
  certificates: paragraph,
  region: short,
  registration: short,
  modality: z.enum(modalities),
  published: z.boolean(),
  photo: z
    .string()
    .max(70000)
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/)
    .optional(),
});
export type TrainerProfile = z.infer<typeof profileSchema>;
export const offerSchema = z.object({
  name: short.min(2),
  price: z.number().int().min(0).max(10000000),
  description: paragraph.min(3),
  modality: z.enum(modalities),
  mode: z.enum(serviceModes),
  updates: short.min(2),
  chat: z.boolean(),
  cancellation: paragraph.min(3),
});
export type Offering = z.infer<typeof offerSchema> & { id: string; trainerId: string };
export type DirectoryEntry = TrainerProfile & {
  id: string;
  sample?: boolean;
  offers: Offering[];
  verification: 'Cadastrado' | 'Documentação local' | 'Verificação pendente';
};
export const money = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function blankProfile(name: string): TrainerProfile {
  return {
    name,
    specialties: '',
    region: '',
    registration: '',
    bio: '',
    education: '',
    experience: '',
    certificates: '',
    modality: 'Online',
    published: false,
  };
}
export function commissionCents(price: number, origin: 'direct' | 'marketplace') {
  return origin === 'marketplace' ? Math.round((price * MARKET_COMMISSION_PERCENT) / 100) : 0;
}
export function searchDirectory(
  entries: DirectoryEntry[],
  query: string,
  modality: string,
  region: string,
  min: number,
  max: number,
) {
  const fold = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  return entries.flatMap((entry) => {
    if (
      !fold(entry.name + ' ' + entry.specialties).includes(fold(query)) ||
      !fold(entry.region).includes(fold(region))
    )
      return [];
    const offers = entry.offers.filter(
      (offer) =>
        (!modality || offer.modality === modality || offer.modality === 'Online e presencial') &&
        offer.price >= min &&
        offer.price <= max,
    );
    if (!offers.length && (entry.offers.length || modality || min > 0 || Number.isFinite(max)))
      return [];
    return [{ ...entry, offers }];
  });
}

// Illustrative listings never create a contract or a verified rating.
export const examples: DirectoryEntry[] = [
  {
    id: 'exemplo-lia',
    name: 'Lia Nunes',
    specialties: 'Força e condicionamento',
    region: 'Belo Horizonte',
    modality: 'Online',
    mode: 'Somente treino',
    price: 12000,
  },
  {
    id: 'exemplo-caio',
    name: 'Caio Reis',
    specialties: 'Corrida e mobilidade',
    region: 'Recife',
    modality: 'Online e presencial',
    mode: 'Híbrido',
    price: 22000,
  },
].map((item) => ({
  ...blankProfile(item.name),
  id: item.id,
  sample: true,
  published: true,
  specialties: item.specialties,
  region: item.region,
  modality: item.modality as TrainerProfile['modality'],
  verification: 'Cadastrado',
  bio: 'Perfil ilustrativo para explorar os formatos de acompanhamento.',
  offers: [
    {
      id: item.id + '-oferta',
      trainerId: item.id,
      name: item.mode === 'Híbrido' ? 'Corrida acompanhada' : 'Programa de força',
      description: 'Ficha individual com revisões conforme o progresso.',
      price: item.price,
      modality: item.modality as Offering['modality'],
      mode: item.mode as Offering['mode'],
      chat: true,
      updates: 'Mensal',
      cancellation: 'Encerramento a pedido do aluno.',
    },
  ],
}));
