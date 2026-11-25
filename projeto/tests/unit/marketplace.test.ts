import { describe, expect, it } from 'vitest';
import { blankProfile, examples, searchDirectory } from '@/domain/marketplace';
import { LocalConnectService } from '@/services/connect-service';
import { LocalMarketplaceService } from '@/services/marketplace-service';
import { MockRepository } from '@/services/mock/repository';
import { createSeed } from '@/services/mock/seed';
import { DEMO_DATE } from '@/domain/types';

async function fixture(mode: 'Somente treino' | 'Com agendamento' | 'Híbrido', discovered = false) {
  const db = new Map<string, string>();
  const storage = () => ({
    getItem: (key: string) => db.get(key) ?? null,
    setItem: (key: string, value: string) => {
      db.set(key, value);
    },
  });
  const connect = new LocalConnectService(storage);
  const market = new LocalMarketplaceService(connect, storage);
  const trainer = await connect.createAccount('personal', 'Treinadora');
  const student = await connect.createAccount('aluno', 'Estudante');
  connect.activate(trainer.id);
  await market.saveProfile(trainer.id, {
    ...blankProfile(trainer.name),
    specialties: 'Corrida',
    published: true,
  });
  await market.saveOffer(trainer.id, {
    name: 'Corrida acompanhada',
    price: 12000,
    description: 'Treino individual',
    mode,
    chat: mode !== 'Somente treino',
    updates: 'Mensal',
    cancellation: 'A pedido.',
    modality: 'Online',
  });
  const offer = market.business(trainer.id).offers[0];
  if (discovered) {
    connect.activate(student.id);
    await market.requestLink(student.id, trainer.id);
    connect.activate(trainer.id);
    await connect.respond(trainer.id, student.id, true);
  } else {
    const invite = await connect.issueInvite(trainer.id);
    connect.activate(student.id);
    await connect.confirm(student.id, invite.token, trainer.id);
  }
  connect.activate(student.id);
  await market.activateOffer(student.id, offer.id, true);
  return { connect, market, trainer, student, offer, storage };
}
describe('Marketplace e agenda por serviço', () => {
  it('filtra por especialidade, modalidade, região e preço no mesmo serviço', () => {
    expect(
      searchDirectory(examples, 'mobilidade', 'Presencial', 'recife', 22000, 22000),
    ).toHaveLength(1);
    expect(searchDirectory(examples, '', 'Presencial', '', 0, 15000)).toHaveLength(0);
    expect(searchDirectory(examples, 'forca', 'Online', 'belo', 0, Infinity)).toHaveLength(1);
  });
  it.each(['Somente treino', 'Com agendamento', 'Híbrido'] as const)(
    'respeita os recursos de %s',
    async (mode) => {
      const { market, student, trainer } = await fixture(mode);
      expect(market.allows(trainer.id, student.id, 'appointments')).toBe(mode !== 'Somente treino');
      expect(market.allows(trainer.id, student.id, 'chat')).toBe(mode !== 'Somente treino');
      expect(market.contracts(student.id)[0].commission).toBe(0);
      expect(market.contracts(trainer.id)).toEqual([]);
    },
  );
  it('mantém o acordo original, atribui a descoberta e separa cancelamento de vínculo', async () => {
    const { market, connect, trainer, student, offer, storage } = await fixture('Híbrido', true);
    const original = market.contracts(student.id)[0];
    expect(original).toMatchObject({ origin: 'marketplace', commission: 1200, endedAt: null });
    connect.activate(trainer.id);
    await market.saveOffer(trainer.id, { ...offer, price: 30000 }, offer.id);
    await expect(market.cancel(student.id, original.id)).rejects.toThrow();
    connect.activate(student.id);
    await expect(market.activateOffer(student.id, offer.id, true)).rejects.toThrow();
    const restored = new LocalMarketplaceService(connect, storage);
    expect(restored.contracts(student.id)[0].offer.price).toBe(12000);
    await market.cancel(student.id, original.id);
    expect(connect.activeTrainer(student.id)?.id).toBe(trainer.id);
    expect(market.allows(trainer.id, student.id, 'chat')).toBe(false);
    expect(market.contracts(student.id)[0].terms).toMatch(/biblioteca/);
  });
  it('mantém contrato simulado após desvinculação sem conceder acesso ao atendimento', async () => {
    const { market, connect, trainer, student } = await fixture('Híbrido', true);
    await connect.unlink(student.id, trainer.id);
    expect(market.contracts(student.id)[0].endedAt).toBeNull();
    expect(market.allows(trainer.id, student.id, 'appointments')).toBe(false);
    await market.cancel(student.id, market.contracts(student.id)[0].id);
  });
  it('verifica disponibilidade, bloqueios, conflito e histórico de reagendamento', async () => {
    const { market, connect, trainer, student } = await fixture('Com agendamento');
    connect.activate(trainer.id);
    await market.setSlot(trainer.id, {
      date: DEMO_DATE,
      start: '09:00',
      end: '14:00',
      kind: 'Disponível',
    });
    await market.setSlot(trainer.id, {
      date: DEMO_DATE,
      start: '11:00',
      end: '12:00',
      kind: 'Bloqueado',
    });
    const seed = createSeed();
    seed.appointments = [];
    seed.students = [{ ...seed.students[0], id: student.id }];
    const repo = new MockRepository(seed, (v) => market.checkBooking(trainer.id, v));
    const booking = {
      date: DEMO_DATE,
      time: '10:00',
      duration: 30,
      kind: 'Online' as const,
      studentId: student.id,
    };
    await expect(repo.saveAppointment({ ...booking, time: '08:30' })).rejects.toThrow(
      /disponibilidade/,
    );
    await expect(repo.saveAppointment({ ...booking, time: '10:45' })).rejects.toThrow(/bloqueado/);
    await repo.saveAppointment(booking);
    await expect(repo.saveAppointment(booking)).rejects.toThrow(/conflita/);
    const { id } = repo.getSnapshot().appointments[0];
    await repo.confirmAppointment(id);
    expect(repo.getSnapshot().appointments[0].confirmed).toBe(true);
    await repo.saveAppointment({ ...booking, time: '13:00' }, id);
    expect(repo.getSnapshot().appointments[0]).toMatchObject({
      time: '13:00',
      confirmed: false,
      previous: [{ date: DEMO_DATE, time: '10:00' }],
    });
    await repo.cancelAppointment(id);
    await expect(repo.confirmAppointment(id)).rejects.toThrow();
  });
  it('oculta perfil retirado e mantém credenciais declaradas sem selo', async () => {
    const { market, connect, trainer } = await fixture('Somente treino');
    connect.activate(trainer.id);
    const { profile } = market.business(trainer.id);
    await market.saveProfile(trainer.id, { ...profile, registration: 'Registro de exemplo' });
    expect(market.directory().find((p) => p.id === trainer.id)?.verification).toBe('Cadastrado');
    await expect(market.setDocumentStatus(trainer.id, 'Verificação pendente')).rejects.toThrow();
    await market.setDocumentStatus(trainer.id, 'Documentação local');
    await market.setDocumentStatus(trainer.id, 'Verificação pendente');
    expect(market.directory().find((p) => p.id === trainer.id)?.verification).toBe(
      'Verificação pendente',
    );
    await market.saveProfile(trainer.id, { ...profile, published: false });
    expect(market.directory().some((p) => p.id === trainer.id)).toBe(false);
  });
});
