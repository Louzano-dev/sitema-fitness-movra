import { z } from 'zod';
import {
  blankProfile,
  commissionCents,
  examples,
  offerSchema,
  profileSchema,
  retentionTerms,
  type DirectoryEntry,
  type TrainerProfile,
} from '@/domain/marketplace';
import type { AppointmentInput } from '@/domain/schemas';
import { appointmentOverlaps, minutes } from '@/domain/selectors';
import type { Appointment } from '@/domain/types';
import { connectService, type ConnectService } from './connect-service';

const key = 'movra:marketplace:1';
const offering = offerSchema.extend({ id: z.string(), trainerId: z.string() });
const contract = z.object({
  id: z.string(),
  trainerId: z.string(),
  studentId: z.string(),
  offer: offering,
  linkId: z.string(),
  startedAt: z.number(),
  endedAt: z.number().nullable(),
  origin: z.enum(['direct', 'marketplace']),
  commission: z.number(),
  terms: z.string(),
});
const slot = z.object({
  id: z.string(),
  trainerId: z.string(),
  date: z.iso.date(),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  kind: z.enum(['Disponível', 'Bloqueado']),
});
const schema = z.object({
  profiles: z.record(z.string(), profileSchema),
  offers: z.array(offering),
  contracts: z.array(contract),
  verification: z.record(z.string(), z.enum(['Documentação local', 'Verificação pendente'])),
  slots: z.array(slot),
});
type State = z.infer<typeof schema>;
export type Contract = z.infer<typeof contract>;
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
const initial = (): State => ({
  profiles: {},
  offers: [],
  contracts: [],
  verification: {},
  slots: [],
});

export class LocalMarketplaceService {
  private memory = initial();
  private version = 0;
  private listeners = new Set<() => void>();
  constructor(
    private connect: ConnectService,
    private storage: () => StoragePort | undefined,
    private clock = Date.now,
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
    if (!this.connect.isActive(id) || this.connect.getAccount(id)?.role !== role)
      throw Error('Entre no perfil Connect responsável por esta ação.');
  }
  directory(): DirectoryEntry[] {
    const state = this.read();
    return [
      ...Object.entries(state.profiles)
        .filter(([, p]) => p.published)
        .map(([id, p]) => ({
          ...p,
          id,
          verification: state.verification[id] ?? 'Cadastrado',
          offers: state.offers.filter((o) => o.trainerId === id),
        })),
      ...examples,
    ];
  }
  business(id: string) {
    this.require(id, 'personal');
    const state = this.read();
    return {
      profile: state.profiles[id] ?? blankProfile(this.connect.getAccount(id)!.name),
      offers: state.offers.filter((o) => o.trainerId === id),
      verification: state.verification[id] ?? 'Cadastrado',
      slots: state.slots.filter((s) => s.trainerId === id),
    };
  }
  saveProfile(id: string, value: TrainerProfile) {
    return this.write((s) => {
      this.require(id, 'personal');
      s.profiles[id] = profileSchema.parse(value);
    });
  }
  saveOffer(trainerId: string, value: z.input<typeof offerSchema>, id?: string) {
    return this.write((s) => {
      this.require(trainerId, 'personal');
      const result = { ...offerSchema.parse(value), id: id ?? crypto.randomUUID(), trainerId };
      if (id && !s.offers.some((o) => o.id === id && o.trainerId === trainerId))
        throw Error('Oferta não encontrada.');
      s.offers = [...s.offers.filter((o) => o.id !== result.id), result];
    });
  }
  setDocumentStatus(trainerId: string, status: 'Documentação local' | 'Verificação pendente') {
    return this.write((s) => {
      this.require(trainerId, 'personal');
      if (status === 'Verificação pendente' && !s.verification[trainerId])
        throw Error('Selecione um documento demonstrativo primeiro.');
      s.verification[trainerId] = status;
    });
  }
  async requestLink(studentId: string, trainerId: string) {
    this.require(studentId, 'aluno');
    const trainer = this.connect.getAccount(trainerId);
    if (!trainer?.publicCode || !this.directory().some((p) => p.id === trainerId))
      throw Error('Perfil indisponível.');
    if (this.connect.pendingTrainer(studentId))
      throw Error('Já existe uma solicitação pendente. Consulte Meu personal.');
    await this.connect.confirm(studentId, trainer.publicCode, trainerId, 'add', 'marketplace');
  }
  activateOffer(studentId: string, offerId: string, accepted: boolean, reviewed?: string) {
    return this.write((s) => {
      this.require(studentId, 'aluno');
      const offer = s.offers.find((o) => o.id === offerId && s.profiles[o.trainerId]?.published);
      const link = this.connect
        .professionalLinks(studentId)
        .find((l) => l.trainerId === offer?.trainerId && l.endedAt === null);
      if (!accepted || !offer || !link)
        throw Error('Confira as condições e o vínculo ativo antes de continuar.');
      if (reviewed && reviewed !== JSON.stringify(offer)) throw Error('A oferta mudou. Leia as novas condições antes de ativá-la.');
      if (s.contracts.some((c) => c.linkId === link.id && c.endedAt === null))
        throw Error('Encerre o serviço atual deste profissional antes de iniciar outro.');
      const origin = link.origin === 'marketplace' ? 'marketplace' : 'direct';
      s.contracts.push({
        id: crypto.randomUUID(),
        trainerId: offer.trainerId,
        studentId,
        offer: { ...offer },
        linkId: link.id,
        startedAt: this.clock(),
        endedAt: null,
        origin,
        commission: commissionCents(offer.price, origin),
        terms: retentionTerms,
      });
    });
  }
  contracts(actorId: string) {
    if (!this.connect.isActive(actorId)) return [];
    return this.read().contracts.filter((c) => c.studentId === actorId || c.trainerId === actorId);
  }
  cancel(studentId: string, id: string) {
    return this.write((s) => {
      this.require(studentId, 'aluno');
      const record = s.contracts.find((c) => c.studentId === studentId && c.id === id);
      if (!record) throw Error('Serviço não encontrado.');
      record.endedAt ??= this.clock();
    });
  }
  allows(
    trainerId: string,
    studentId: string,
    capability: 'chat' | 'appointments' | 'training',
    startedAt?: number,
  ) {
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
    if (!active) return !records.length && capability !== 'appointments' && link.origin !== 'marketplace';
    if (capability === 'training') return true;
    return capability === 'chat' ? active.offer.chat : active.offer.mode !== 'Somente treino';
  }
  setSlot(trainerId: string, input: Pick<z.infer<typeof slot>, 'date' | 'start' | 'end' | 'kind'>) {
    return this.write((s) => {
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
      s.slots.push(row);
    });
  }
  removeSlot(trainerId: string, id: string) {
    return this.write((s) => {
      this.require(trainerId, 'personal');
      s.slots = s.slots.filter((x) => x.trainerId !== trainerId || x.id !== id);
    });
  }
  checkBooking(trainerId: string, input: AppointmentInput, latest?: Appointment[], id?: string) {
    this.require(trainerId, 'personal');
    if(id && latest && !latest.some(a=>a.id===id && a.studentId===input.studentId && a.status==='Agendado')) throw Error('Agendamento alterado em outra aba. Atualize a agenda.');
    if(latest?.some(a=>a.id!==id && appointmentOverlaps(input,a))) throw Error('Este horário conflita com outro agendamento. Escolha outro horário.');
    if (
      input.studentId.startsWith('s-') &&
      !this.allows(trainerId, input.studentId, 'appointments')
    )
      throw Error('O acompanhamento deste aluno não inclui sessões agendadas.');
    const rows = this.business(trainerId).slots.filter((s) => s.date === input.date);
    const start = minutes(input.time),
      end = start + input.duration;
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

export const marketplaceService = new LocalMarketplaceService(connectService, () => {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
});
export const linkAllows = (
  trainerId: string,
  studentId: string,
  capability: 'chat' | 'appointments' | 'training',
  startedAt?: number,
) => marketplaceService.allows(trainerId, studentId, capability, startedAt);
