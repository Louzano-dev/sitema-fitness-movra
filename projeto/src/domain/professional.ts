import { z } from 'zod';

export const modalities = ['Online', 'Presencial', 'Online e presencial'] as const;
const short = z.string().trim().max(140);
const paragraph = z.string().trim().max(1500);

export function whatsappNumber(value: string) {
  if (!/^\+?[\d().\s-]+$/.test(value)) return '';
  const digits = value.replace(/\D/g, '');
  return /^[1-9]\d{9,14}$/.test(digits) ? digits : '';
}

export const profileSchema = z.object({
  name: short.min(2),
  specialties: short,
  bio: paragraph,
  education: paragraph,
  experience: paragraph,
  certificates: paragraph,
  region: short,
  registration: short,
  modality: z.enum(modalities),
  whatsapp: z
    .string()
    .trim()
    .max(35)
    .refine(
      (value) => !value || !!whatsappNumber(value),
      'Use o número com código do país e DDD, por exemplo +55 11 91234-5678.',
    )
    .optional(),
  photo: z
    .string()
    .max(70000)
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/)
    .optional(),
});

export type TrainerProfile = z.infer<typeof profileSchema>;

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
  };
}
