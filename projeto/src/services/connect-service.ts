import { z } from 'zod';

const accountSchema = z.object({
  id: z.string(),
  role: z.enum(['personal', 'aluno']),
  name: z.string(),
  publicCode: z.string().optional(),
});
export type ConnectAccount = z.infer<typeof accountSchema>;
const inviteSchema = z.object({
  token: z.string(),
  trainerId: z.string(),
  expiresAt: z.number(),
  revoked: z.boolean(),
  usedAt: z.number().nullable(),
});
export type ConnectInvite = z.infer<typeof inviteSchema>;
type Candidate = { trainer: ConnectAccount; method: 'individual' | 'public' };
const originSchema = z.enum(['marketplace', 'direct']);
type Origin = z.infer<typeof originSchema>;
type LinkMode = 'add' | 'replace';
const linkSchema = z.object({
  id: z.string().optional(),
  origin: originSchema.optional(),
  studentId: z.string(),
  trainerId: z.string(),
  startedAt: z.number(),
  endedAt: z.number().nullable(),
});
const stateSchema = z.object({
  version: z.literal(1),
  accounts: z.array(accountSchema),
  invites: z.array(inviteSchema),
  links: z.array(linkSchema),
  requests: z.array(
    z.object({
      studentId: z.string(),
      trainerId: z.string(),
      mode: z.enum(['add', 'replace']).optional(),
      origin: originSchema.optional(),
    }),
  ),
  attempts: z.record(z.string(), z.array(z.number())),
});
type State = z.infer<typeof stateSchema>;
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
const KEY = 'movra:connect:1';
const WINDOW = 60_000;
const MAX_FAILURES = 5;
const DAY = 86_400_000;
const fresh = (): State => ({
  version: 1,
  accounts: [],
  invites: [],
  links: [],
  requests: [],
  attempts: {},
});

function randomHex(bytes: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

export function inviteStatus(invite: ConnectInvite, now = Date.now()) {
  if (invite.revoked) return 'Revogado';
  if (invite.usedAt !== null) return 'Utilizado';
  return now >= invite.expiresAt ? 'Expirado' : 'Disponível';
}

export function inviteCredential(input: string) {
  const value = input.trim();
  if (!value || value.length > 4096) return '';
  if (/^(?:https?:\/\/|file:\/\/|#\/entrar\?)/i.test(value)) {
    try {
      const url = new URL(value, 'https://movra.invalid');
      const hash = url.hash.slice(1);
      const params = new URLSearchParams(hash.startsWith('/entrar?') ? hash.slice(8) : hash);
      return params.get('convite') ?? url.searchParams.get('convite') ?? '';
    } catch {
      return '';
    }
  }
  return value;
}

function addLink(
  state: State,
  studentId: string,
  trainerId: string,
  now: number,
  mode: LinkMode,
  origin: Origin,
) {
  const current = state.links.filter(
    (link) => link.studentId === studentId && link.endedAt === null,
  );
  if (current.some((link) => link.trainerId === trainerId))
    throw new Error('Você já está conectado a este personal.');
  if (mode === 'replace') for (const link of current) link.endedAt = now;
  state.links.push({
    id: randomHex(16),
    origin,
    studentId,
    trainerId,
    startedAt: now,
    endedAt: null,
  });
  state.requests = state.requests.filter((entry) => entry.studentId !== studentId);
}

export interface ConnectService {
  createAccount(role: ConnectAccount['role'], name: string): Promise<ConnectAccount>;
  listAccounts(): ConnectAccount[];
  renameAccount(id: string, name: string): Promise<void>;
  getAccount(id: string): ConnectAccount | null;
  activate(id: string | null): void;
  isActive(id: string): boolean;
  professionalLinks(actorId: string): (z.infer<typeof linkSchema> & { id: string })[];
  activeTrainers(studentId: string): ConnectAccount[];
  activeTrainer(studentId: string): ConnectAccount | null;
  linkedStudents(trainerId: string): ConnectAccount[];
  listInvites(trainerId: string): ConnectInvite[];
  issueInvite(trainerId: string): Promise<ConnectInvite>;
  revokeInvite(trainerId: string, token: string): Promise<void>;
  preview(studentId: string, input: string): Promise<Candidate>;
  confirm(
    studentId: string,
    input: string,
    expectedTrainerId: string,
    mode?: LinkMode,
  ): Promise<Candidate['method']>;
  pendingTrainer(studentId: string): ConnectAccount | null;
  pendingStudents(trainerId: string): ConnectAccount[];
  cancelRequest(studentId: string): Promise<void>;
  respond(trainerId: string, studentId: string, approve: boolean): Promise<void>;
  unlink(studentId: string, trainerId: string): Promise<void>;
  subscribe(listener: () => void): () => void;
  revision(): number;
}

// Account selection models a local demo session. A remote adapter must obtain the
// actor from server authentication and perform each write in a database transaction.
export class LocalConnectService implements ConnectService {
  private memory = fresh();
  private actor: string | null = null;
  private listeners = new Set<() => void>();
  private version = 0;
  constructor(
    private storage: () => StoragePort | undefined,
    private clock = Date.now,
  ) {}

  private emit = () => {
    this.version++;
    this.listeners.forEach((listener) => listener());
  };
  private storageEvent = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) this.emit();
  };
  subscribe = (listener: () => void) => {
    if (!this.listeners.size && typeof window !== 'undefined') {
      window.addEventListener('storage', this.storageEvent);
    }
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size && typeof window !== 'undefined') {
        window.removeEventListener('storage', this.storageEvent);
      }
    };
  };
  revision = () => this.version;

  private read(): State {
    const storage = this.storage();
    if (!storage) return structuredClone(this.memory);
    const raw = storage.getItem(KEY);
    if (!raw) return fresh();
    const parsed = stateSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) throw new Error('Os dados locais do MOVRA Connect não puderam ser lidos.');
    return parsed.data;
  }
  private async write<T>(update: (state: State) => T): Promise<T> {
    const execute = () => {
      const state = this.read();
      const result = update(state);
      const storage = this.storage();
      if (storage) storage.setItem(KEY, JSON.stringify(state));
      else this.memory = state;
      this.emit();
      return result;
    };
    if (typeof window !== 'undefined' && window.navigator.locks) {
      return window.navigator.locks.request(KEY, execute);
    }
    return execute();
  }
  private authorize(state: State, id: string, role: ConnectAccount['role']) {
    if (this.actor !== id || !state.accounts.some((a) => a.id === id && a.role === role)) {
      throw new Error('Entre no perfil autorizado para continuar.');
    }
  }
  listAccounts = () => this.read().accounts;
  getAccount = (id: string) => this.read().accounts.find((account) => account.id === id) ?? null;
  isActive = (id: string) => this.actor === id;
  activate(id: string | null) {
    if (id !== null && !this.getAccount(id)) throw new Error('Conta local não encontrada.');
    if (id !== this.actor) {
      this.actor = id;
      this.emit();
    }
  }
  async createAccount(role: ConnectAccount['role'], inputName: string) {
    const name = inputName.trim();
    if (!['personal', 'aluno'].includes(role) || name.length < 2 || name.length > 100) {
      throw new Error('Escolha um perfil e use um nome de 2 a 100 caracteres.');
    }
    return this.write((state) => {
      const id = (role === 'personal' ? 'p-' : 's-') + randomHex(16);
      const account: ConnectAccount = { id, name, role };
      if (role === 'personal') {
        do {
          account.publicCode = 'MOVRA-' + randomHex(4).toUpperCase();
        } while (state.accounts.some((a) => a.publicCode === account.publicCode));
      }
      state.accounts.push(account);
      return { ...account };
    });
  }
  renameAccount(id: string, input: string) {
    return this.write((state) => {
      const account = state.accounts.find((a) => a.id === id);
      if (!account || this.actor !== id) throw Error('Perfil não autorizado.');
      const name = input.trim();
      if (name.length < 2 || name.length > 100) throw Error('Use um nome de 2 a 100 caracteres.');
      account.name = name;
    });
  }
  professionalLinks(actorId: string) {
    if (!this.isActive(actorId)) return [];
    return this.read()
      .links.filter((l) => l.studentId === actorId || l.trainerId === actorId)
      .map((l) => ({ ...l, id: l.id ?? [l.trainerId, l.studentId, l.startedAt].join(':') }));
  }
  activeTrainers(studentId: string) {
    if (!this.actor) return [];
    const state = this.read();
    const links = state.links
      .filter(
        (l) =>
          l.studentId === studentId &&
          l.endedAt === null &&
          (this.actor === studentId || this.actor === l.trainerId),
      )
      .reverse();
    return links.flatMap((l) => state.accounts.filter((a) => a.id === l.trainerId));
  }
  activeTrainer(studentId: string) {
    return this.activeTrainers(studentId)[0] ?? null;
  }
  linkedStudents(trainerId: string) {
    if (!this.actor || this.actor !== trainerId) return [];
    const state = this.read();
    const ids = new Set(
      state.links
        .filter((l) => l.endedAt === null && l.trainerId === trainerId)
        .map((l) => l.studentId),
    );
    return state.accounts.filter((a) => ids.has(a.id));
  }
  listInvites(trainerId: string) {
    const state = this.read();
    this.authorize(state, trainerId, 'personal');
    return state.invites.filter((i) => i.trainerId === trainerId).reverse();
  }
  issueInvite(trainerId: string) {
    return this.write((state) => {
      this.authorize(state, trainerId, 'personal');
      const invite: ConnectInvite = {
        trainerId,
        token: randomHex(24),
        expiresAt: this.clock() + DAY,
        usedAt: null,
        revoked: false,
      };
      state.invites.push(invite);
      return { ...invite };
    });
  }
  revokeInvite(trainerId: string, token: string) {
    return this.write((state) => {
      this.authorize(state, trainerId, 'personal');
      const invite = state.invites.find((i) => i.trainerId === trainerId && i.token === token);
      if (!invite) throw new Error('Convite não encontrado neste perfil.');
      invite.revoked = true;
    });
  }
  private async lookup<T>(
    studentId: string,
    input: string,
    proceed: (state: State, candidate: Candidate, invite?: ConnectInvite) => T,
  ): Promise<T> {
    const result = await this.write((state): { value: T } | { error: string } => {
      this.authorize(state, studentId, 'aluno');
      const now = this.clock();
      const attempts = (state.attempts[studentId] ?? []).filter((time) => time > now - WINDOW);
      if (attempts.length >= MAX_FAILURES) throw new Error('Muitas tentativas. Aguarde um minuto.');
      const credential = inviteCredential(input);
      const invite = state.invites.find((i) => i.token === credential);
      const trainer = state.accounts.find(
        (a) =>
          a.role === 'personal' &&
          (invite ? a.id === invite.trainerId : a.publicCode === credential.toUpperCase()),
      );
      const status = invite && inviteStatus(invite, now);
      if (!trainer || (status && status !== 'Disponível')) {
        state.attempts[studentId] = [...attempts, now];
        return {
          error: status
            ? 'Convite ' + status.toLowerCase() + '.'
            : 'Código ou convite inválido neste navegador.',
        };
      }
      return {
        value: proceed(state, { trainer, method: invite ? 'individual' : 'public' }, invite),
      };
    });
    if ('error' in result) throw new Error(result.error);
    return result.value;
  }
  preview(studentId: string, input: string) {
    return this.lookup(studentId, input, (_, candidate) => candidate);
  }
  confirm(
    studentId: string,
    input: string,
    expectedTrainerId: string,
    mode: LinkMode = 'replace',
  ) {
    return this.lookup(studentId, input, (state, candidate, invite) => {
      if (candidate.trainer.id !== expectedTrainerId)
        throw new Error('Confira o personal novamente.');
      if (
        state.links.some(
          (l) =>
            l.studentId === studentId && l.trainerId === expectedTrainerId && l.endedAt === null,
        )
      ) {
        throw new Error('Você já está conectado a este personal.');
      }
      if (invite) {
        addLink(state, studentId, expectedTrainerId, this.clock(), mode, 'direct');
        invite.usedAt = this.clock();
      } else {
        state.requests = state.requests.filter((request) => request.studentId !== studentId);
        state.requests.push({ studentId, trainerId: expectedTrainerId, mode, origin: 'direct' });
      }
      return candidate.method;
    });
  }
  pendingTrainer(studentId: string) {
    const state = this.read();
    this.authorize(state, studentId, 'aluno');
    const request = state.requests.find((r) => r.studentId === studentId);
    return state.accounts.find((a) => a.id === request?.trainerId) ?? null;
  }
  pendingStudents(trainerId: string) {
    const state = this.read();
    this.authorize(state, trainerId, 'personal');
    const ids = new Set(
      state.requests.filter((r) => r.trainerId === trainerId).map((r) => r.studentId),
    );
    return state.accounts.filter((a) => ids.has(a.id));
  }
  cancelRequest(studentId: string) {
    return this.write((state) => {
      this.authorize(state, studentId, 'aluno');
      state.requests = state.requests.filter((r) => r.studentId !== studentId);
    });
  }
  respond(trainerId: string, studentId: string, approve: boolean) {
    return this.write((state) => {
      this.authorize(state, trainerId, 'personal');
      const request = state.requests.find(
        (r) => r.trainerId === trainerId && r.studentId === studentId,
      );
      if (!request) {
        throw new Error('Solicitação não encontrada neste perfil.');
      }
      if (approve)
        addLink(
          state,
          studentId,
          trainerId,
          this.clock(),
          request.mode ?? 'replace',
          request.origin ?? 'direct',
        );
      else state.requests = state.requests.filter((r) => r.studentId !== studentId);
    });
  }
  unlink(studentId: string, trainerId: string) {
    return this.write((state) => {
      if (this.actor !== studentId && this.actor !== trainerId)
        throw new Error('Perfil não autorizado.');
      const link = state.links.find(
        (l) => l.studentId === studentId && l.trainerId === trainerId && l.endedAt === null,
      );
      if (!link || link.trainerId !== trainerId)
        throw new Error('Vínculo não encontrado neste perfil.');
      link.endedAt = this.clock();
    });
  }
}

export const connectService: ConnectService = new LocalConnectService(() => {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
});
