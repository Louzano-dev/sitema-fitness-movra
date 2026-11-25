import { z } from 'zod';
import { blankProfile, profileSchema, type TrainerProfile } from '@/domain/professional';
import type { AppointmentInput } from '@/domain/schemas';
import { appointmentOverlaps, minutes } from '@/domain/selectors';
import type { Appointment } from '@/domain/types';
import { connectService, type ConnectService } from './connect-service';

// Keep the storage key and round-trip legacy data that the MVP no longer edits.
const key = 'movra:marketplace:1';
const oldContract = z.looseObject({
  linkId: z.string(),
  endedAt: z.number().nullable(),
  offer: z.looseObject({ mode: z.enum(['Somente treino', 'Com agendamento', 'Híbrido']) }),
});
const slot = z.object({
  id: z.string(),
  trainerId: z.string(),
  date: z.iso.date(),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  kind: z.enum(['Disponível', 'Bloqueado']),
});
const schema = z.looseObject({
  profiles: z.record(z.string(), profileSchema.loose()).default({}),
  contracts: z.array(oldContract).default([]),
  slots: z.array(slot).default([]),
});
type State = z.infer<typeof schema>;
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
type SlotInput = Pick<z.infer<typeof slot>, 'date' | 'start' | 'end' | 'kind'>;
type Capability = 'appointments' | 'training';

export class LocalProfessionalService {
  private memory: State = { profiles: {}, contracts: [], slots: [] };
  private version = 0;
  private listeners = new Set<() => void>();
  constructor(
    private connect: ConnectService,
    private storage: () => StoragePort | undefined,
  ) {}
  revision = () => this.version;
  private notify = () => {
    this.version++;
    this.listeners.forEach((fn) => fn());
  };
  private onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) this.notify();
  };
  subscribe = (fn: () => void) => {
    if (!this.listeners.size && typeof window !== 'undefined')
      window.addEventListener('storage', this.onStorage);
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
      if (!this.listeners.size && typeof window !== 'undefined')
        window.removeEventListener('storage', this.onStorage);
    };
  };
  private read() {
    const raw = this.storage()?.getItem(key);
    return raw ? schema.parse(JSON.parse(raw)) : structuredClone(this.memory);
  }
  private async write<T>(update: (s: State) => T) {
    const execute = () => {
      const state = this.read();
      const result = update(state);
      const storage = this.storage();
      if (storage) storage.setItem(key, JSON.stringify(state));
      else this.memory = state;
      this.notify();
      return result;
    };
    return typeof window !== 'undefined' && window.navigator.locks
      ? window.navigator.locks.request(key, execute)
      : execute();
  }
  private require(id: string, role: 'personal' | 'aluno') {
    const account = this.connect.getAccount(id);
    if (!this.connect.isActive(id) || account?.role !== role)
      throw Error('Entre no perfil Connect responsável por esta ação.');
    return account;
  }
  private profile(trainerId: string) {
    const account = this.connect.getAccount(trainerId);
    if (!account || account.role !== 'personal') return null;
    const profile = this.read().profiles[trainerId];
    return profile ? profileSchema.parse(profile) : blankProfile(account.name);
  }
  ownProfile(id: string) {
    const account = this.require(id, 'personal');
    return this.profile(id) ?? blankProfile(account.name);
  }
  saveProfile(id: string, value: TrainerProfile) {
    return this.write((s) => {
      this.require(id, 'personal');
      const profile = profileSchema.parse(value);
      s.profiles[id] = {
        ...s.profiles[id],
        ...profile,
        photo: profile.photo,
        whatsapp: profile.whatsapp,
      };
    });
  }
  async previewInvitation(studentId: string, credential: string) {
    const candidate = await this.connect.preview(studentId, credential);
    const profile = this.profile(candidate.trainer.id);
    return {
      ...candidate,
      profile: profile && {
        name: profile.name,
        specialties: profile.specialties,
        photo: profile.photo,
      },
    };
  }
  linkedProfile(studentId: string, trainerId: string) {
    if (!this.connect.isActive(studentId) || this.connect.getAccount(studentId)?.role !== 'aluno')
      return null;
    return this.connect
      .professionalLinks(studentId)
      .some((link) => link.trainerId === trainerId && link.endedAt === null)
      ? this.profile(trainerId)
      : null;
  }
  allows(trainerId: string, studentId: string, capability: Capability, startedAt?: number) {
    const actor = this.connect.isActive(trainerId) ? trainerId : studentId;
    const link = this.connect
      .professionalLinks(actor)
      .find(
        (l) =>
          l.trainerId === trainerId &&
          l.studentId === studentId &&
          l.endedAt === null &&
          (startedAt === undefined || l.startedAt === startedAt),
      );
    if (!link) return false;
    const records = this.read().contracts.filter((c) => c.linkId === link.id);
    const active = records.find((c) => c.endedAt === null);
    if (!active) return !records.length && link.origin !== 'marketplace';
    return capability === 'training' || active.offer.mode !== 'Somente treino';
  }
  slots(trainerId: string, date: string) {
    this.require(trainerId, 'personal');
    return this.read().slots.filter((s) => s.trainerId === trainerId && s.date === date);
  }
  async setSlot(trainerId: string, input: SlotInput, latest?: () => Appointment[]) {
    const save = () =>
      this.write((s) => {
        this.require(trainerId, 'personal');
        const row = slot.parse({ ...input, id: crypto.randomUUID(), trainerId });
        if (row.start >= row.end) throw Error('O fim deve ser posterior ao início.');
        if (
          s.slots.some(
            (x) =>
              x.trainerId === trainerId &&
              x.date === row.date &&
              x.kind === row.kind &&
              x.start < row.end &&
              row.start < x.end,
          )
        )
          throw Error('Já existe uma faixa desse tipo neste intervalo.');
        if (
          row.kind === 'Bloqueado' &&
          latest?.().some((entry) =>
            appointmentOverlaps(
              {
                date: row.date,
                time: row.start,
                duration: minutes(row.end) - minutes(row.start),
              },
              entry,
            ),
          )
        )
          throw Error('Reagende ou cancele o encontro existente antes de bloquear este horário.');
        s.slots.push(row);
      });
    return typeof window !== 'undefined' && window.navigator.locks
      ? window.navigator.locks.request('movra:connect:agenda', save)
      : save();
  }
  removeSlot(trainerId: string, id: string) {
    return this.write((s) => {
      this.require(trainerId, 'personal');
      s.slots = s.slots.filter((x) => x.trainerId !== trainerId || x.id !== id);
    });
  }
  checkBooking(trainerId: string, input: AppointmentInput, latest?: Appointment[], id?: string) {
    this.require(trainerId, 'personal');
    if (
      id &&
      latest &&
      !latest.some((a) => a.id === id && a.studentId === input.studentId && a.status === 'Agendado')
    )
      throw Error('Agendamento alterado em outra aba. Atualize a agenda.');
    if (latest?.some((a) => a.id !== id && appointmentOverlaps(input, a)))
      throw Error('Este horário conflita com outro agendamento. Escolha outro horário.');
    if (
      input.studentId.startsWith('s-') &&
      !this.allows(trainerId, input.studentId, 'appointments')
    )
      throw Error('O acompanhamento deste aluno precisa estar ativo para agendar encontros.');
    const rows = this.slots(trainerId, input.date);
    const start = minutes(input.time);
    const end = start + input.duration;
    if (
      rows.some((s) => s.kind === 'Bloqueado' && minutes(s.start) < end && minutes(s.end) > start)
    )
      throw Error('Este horário está bloqueado.');
    const available = rows.filter((s) => s.kind === 'Disponível');
    if (
      available.length &&
      !available.some((s) => minutes(s.start) <= start && end <= minutes(s.end))
    )
      throw Error('Escolha um horário dentro da disponibilidade.');
  }
}

export const professionalService = new LocalProfessionalService(connectService, () => {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
});

export const linkAllows = (
  trainerId: string,
  studentId: string,
  capability: Capability,
  startedAt?: number,
) => professionalService.allows(trainerId, studentId, capability, startedAt);
