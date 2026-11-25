import { describe, expect, it } from 'vitest';
import { whatsappNumber } from '@/domain/professional';
import { LocalConnectService } from '@/services/connect-service';
import { LocalProfessionalService } from '@/services/professional-service';
import { MockRepository } from '@/services/mock/repository';
import { createSeed } from '@/services/mock/seed';
import { DEMO_DATE } from '@/domain/types';

const previousKey = 'movra:marketplace:1';

async function fixture() {
  const data = new Map<string, string>();
  const storage = () => ({
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  });
  const connect = new LocalConnectService(storage);
  const professional = new LocalProfessionalService(connect, storage);
  const trainer = await connect.createAccount('personal', 'Treinadora');
  const student = await connect.createAccount('aluno', 'Estudante');
  const peer = await connect.createAccount('aluno', 'Outro estudante');
  connect.activate(trainer.id);
  const invite = await connect.issueInvite(trainer.id);
  async function link() {
    connect.activate(student.id);
    await connect.confirm(student.id, invite.token, trainer.id);
  }
  return { connect, professional, trainer, student, peer, invite, link, data };
}

describe('Perfil profissional e agenda opcional', () => {
  it('mostra o currículo e WhatsApp somente ao aluno já vinculado', async () => {
    const { connect, professional, trainer, student, peer, invite, link } = await fixture();
    const profile = {
      ...professional.ownProfile(trainer.id),
      specialties: 'Corrida em trilha',
      registration: 'CREF declarado',
      whatsapp: '+55 11 91234-5678',
    };
    await expect(
      professional.saveProfile(trainer.id, { ...profile, whatsapp: 'https://example.org' }),
    ).rejects.toThrow();
    await professional.saveProfile(trainer.id, profile);
    connect.activate(student.id);
    expect(professional.linkedProfile(student.id, trainer.id)).toBeNull();
    expect((await professional.previewInvitation(student.id, invite.token)).profile).toEqual({
      name: trainer.name,
      specialties: 'Corrida em trilha',
      photo: undefined,
    });
    await link();
    const linked = professional.linkedProfile(student.id, trainer.id);
    expect(linked).toEqual(profile);
    expect(whatsappNumber(linked!.whatsapp!)).toBe('5511912345678');
    connect.activate(peer.id);
    expect(professional.linkedProfile(peer.id, trainer.id)).toBeNull();
    expect(professional.linkedProfile(student.id, trainer.id)).toBeNull();
    connect.activate(student.id);
    await connect.unlink(student.id, trainer.id);
    expect(professional.linkedProfile(student.id, trainer.id)).toBeNull();
  });

  it('preserva os registros antigos e respeita os limites dos acompanhamentos anteriores', async () => {
    const { connect, professional, trainer, student, link, data } = await fixture();
    await link();
    const [{ id: linkId }] = connect.professionalLinks(student.id);
    const connectState = JSON.parse(data.get('movra:connect:1')!);
    connectState.links[0].origin = 'marketplace';
    data.set('movra:connect:1', JSON.stringify(connectState));
    connect.activate(trainer.id);
    const profile = { ...professional.ownProfile(trainer.id), published: true };
    const offers = [{ id: 'oferta-anterior' }];
    const record = {
      linkId,
      offer: { mode: 'Somente treino', price: 12000 },
      endedAt: null,
      terms: 'Uso pessoal',
    };
    const previous = { profiles: { [trainer.id]: profile }, offers, contracts: [record] };
    data.set(previousKey, JSON.stringify(previous));
    expect(professional.allows(trainer.id, student.id, 'training')).toBe(true);
    expect(professional.allows(trainer.id, student.id, 'appointments')).toBe(false);
    await professional.saveProfile(trainer.id, { ...profile, education: 'Educação Física' });
    expect(JSON.parse(data.get(previousKey)!)).toMatchObject({
      profiles: { [trainer.id]: { published: true, education: 'Educação Física' } },
      offers,
      contracts: [record],
    });
    data.set(
      previousKey,
      JSON.stringify({ ...previous, contracts: [{ ...record, endedAt: Date.now() }] }),
    );
    expect(professional.allows(trainer.id, student.id, 'training')).toBe(false);
    expect(professional.allows(trainer.id, student.id, 'appointments')).toBe(false);
  });

  it('admite agendamento explícito no vínculo direto com disponibilidade, bloqueios e conflito', async () => {
    const { connect, professional, trainer, student, link } = await fixture();
    await link();
    connect.activate(trainer.id);
    expect(professional.allows(trainer.id, student.id, 'training')).toBe(true);
    expect(professional.allows(trainer.id, student.id, 'appointments')).toBe(true);
    await professional.setSlot(trainer.id, {
      date: DEMO_DATE,
      start: '09:00',
      end: '14:00',
      kind: 'Disponível',
    });
    await professional.setSlot(trainer.id, {
      date: DEMO_DATE,
      start: '11:00',
      end: '12:00',
      kind: 'Bloqueado',
    });
    const seed = createSeed();
    seed.appointments = [];
    seed.students = [{ ...seed.students[0], id: student.id }];
    const repo = new MockRepository(seed, (input) => professional.checkBooking(trainer.id, input));
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
    await expect(
      professional.setSlot(
        trainer.id,
        {
          date: DEMO_DATE,
          start: '10:15',
          end: '10:45',
          kind: 'Bloqueado',
        },
        () => repo.getSnapshot().appointments,
      ),
    ).rejects.toThrow(/bloquear/);
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
});
