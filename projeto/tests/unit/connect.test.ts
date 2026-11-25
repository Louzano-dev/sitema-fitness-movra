import { describe, expect, it } from 'vitest';
import { inviteCredential, LocalConnectService } from '@/services/connect-service';

async function fixture() {
  const db = new Map<string, string>();
  const storage = {
    getItem: (key: string) => db.get(key) ?? null,
    setItem: (key: string, value: string) => {
      db.set(key, value);
    },
  };
  let time = new Date('2026-11-18T10:00:00Z').getTime();
  const open = () =>
    new LocalConnectService(
      () => storage,
      () => time,
    );
  const service = open();
  const trainer = await service.createAccount('personal', 'Personal A');
  const other = await service.createAccount('personal', 'Personal B');
  const student = await service.createAccount('aluno', 'Aluno A');
  const peer = await service.createAccount('aluno', 'Aluno B');
  return {
    service,
    trainer,
    other,
    student,
    peer,
    open,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe('MOVRA Connect local', () => {
  it('separa contas e códigos públicos, exige perfil ativo e impede operações entre contas', async () => {
    const { service, trainer, other, student } = await fixture();
    expect(trainer.publicCode).toMatch(/^MOVRA-[A-F0-9]{8}$/);
    expect(other.publicCode).not.toBe(trainer.publicCode);
    expect(student.publicCode).toBeUndefined();
    await expect(service.issueInvite(trainer.id)).rejects.toThrow(/autorizado/);
    service.activate(trainer.id);
    const invite = await service.issueInvite(trainer.id);
    expect(invite.token).toMatch(/^[a-f0-9]{48}$/);
    expect(invite.token).not.toContain(trainer.id);
    service.activate(other.id);
    expect(service.listInvites(other.id)).toEqual([]);
    expect(() => service.listInvites(trainer.id)).toThrow(/autorizado/);
    await expect(service.revokeInvite(other.id, invite.token)).rejects.toThrow();
    service.activate(student.id);
    await expect(service.issueInvite(student.id)).rejects.toThrow(/autorizado/);
    service.activate(null);
    await expect(service.preview(student.id, invite.token)).rejects.toThrow(/autorizado/);
  });
  it('preserva solicitação na recarga e libera apenas o próprio aluno após aprovação pelo personal', async () => {
    const { service, trainer, other, student, peer, open } = await fixture();
    service.activate(student.id);
    const preview = await service.preview(student.id, trainer.publicCode!.toLowerCase());
    expect(preview).toMatchObject({ trainer, method: 'public' });
    expect(service.activeTrainer(student.id)).toBeNull();
    await expect(service.confirm(student.id, trainer.publicCode!, other.id)).rejects.toThrow(
      /Confira/,
    );
    await service.confirm(student.id, trainer.publicCode!, trainer.id);
    expect(service.activeTrainer(student.id)).toBeNull();
    expect(service.pendingTrainer(student.id)).toEqual(trainer);
    const reloaded = open();
    reloaded.activate(other.id);
    expect(reloaded.pendingStudents(other.id)).toEqual([]);
    await expect(reloaded.respond(other.id, student.id, true)).rejects.toThrow();
    reloaded.activate(trainer.id);
    expect(reloaded.pendingStudents(trainer.id)).toEqual([student]);
    expect(reloaded.linkedStudents(trainer.id)).toEqual([]);
    await reloaded.respond(trainer.id, student.id, true);
    expect(reloaded.linkedStudents(trainer.id)).toEqual([student]);
    expect(service.activeTrainer(student.id)).toEqual(trainer);
    service.activate(peer.id);
    expect(service.activeTrainer(student.id)).toBeNull();
    expect(service.linkedStudents(trainer.id)).toEqual([]);
  });
  it('permite cancelar ou recusar solicitações e revalida autorização na resposta', async () => {
    const { service, trainer, student } = await fixture();
    service.activate(student.id);
    await service.confirm(student.id, trainer.publicCode!, trainer.id);
    await service.cancelRequest(student.id);
    service.activate(trainer.id);
    await expect(service.respond(trainer.id, student.id, true)).rejects.toThrow();
    service.activate(student.id);
    await service.confirm(student.id, trainer.publicCode!, trainer.id);
    service.activate(trainer.id);
    await service.respond(trainer.id, student.id, false);
    expect(service.pendingStudents(trainer.id)).toEqual([]);
    expect(service.linkedStudents(trainer.id)).toEqual([]);
  });
  it('aceita um único uso, mesmo com confirmação em duas sessões', async () => {
    const { service, trainer, student, peer, open } = await fixture();
    service.activate(trainer.id);
    const invite = await service.issueInvite(trainer.id);
    service.activate(student.id);
    const otherSession = open();
    otherSession.activate(peer.id);
    await Promise.all([
      service.preview(student.id, invite.token),
      otherSession.preview(peer.id, invite.token),
    ]);
    const outcomes = await Promise.allSettled([
      service.confirm(student.id, invite.token, trainer.id),
      otherSession.confirm(peer.id, invite.token, trainer.id),
    ]);
    expect(outcomes.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((item) => item.status === 'rejected')).toHaveLength(1);
    service.activate(trainer.id);
    expect(service.linkedStudents(trainer.id)).toHaveLength(1);
    expect(service.listInvites(trainer.id)[0].usedAt).toBeTypeOf('number');
  });
  it('revalida expiração e revogação entre a prévia e a confirmação', async () => {
    const { service, trainer, student, advance, open } = await fixture();
    service.activate(trainer.id);
    const revoked = await service.issueInvite(trainer.id);
    const expiring = await service.issueInvite(trainer.id);
    const otherSession = open();
    otherSession.activate(student.id);
    await otherSession.preview(student.id, revoked.token);
    await otherSession.preview(student.id, expiring.token);
    await service.revokeInvite(trainer.id, revoked.token);
    await expect(otherSession.confirm(student.id, revoked.token, trainer.id)).rejects.toThrow(
      /revogado/,
    );
    advance(24 * 60 * 60 * 1000);
    await expect(otherSession.confirm(student.id, expiring.token, trainer.id)).rejects.toThrow(
      /expirado/,
    );
    expect(service.linkedStudents(trainer.id)).toEqual([]);
  });
  it('limita tentativas por conta, inclusive depois de recarregar, e libera após a janela', async () => {
    const { service, student, peer, trainer, advance, open } = await fixture();
    service.activate(student.id);
    for (let i = 0; i < 5; i++) {
      await expect(service.preview(student.id, 'inválido')).rejects.toThrow(/inválido/);
    }
    const reloaded = open();
    reloaded.activate(student.id);
    await expect(reloaded.preview(student.id, trainer.publicCode!)).rejects.toThrow(
      /Muitas tentativas/,
    );
    service.activate(peer.id);
    await expect(service.preview(peer.id, trainer.publicCode!)).resolves.toMatchObject({ trainer });
    advance(60_000);
    await expect(reloaded.preview(student.id, trainer.publicCode!)).resolves.toMatchObject({
      trainer,
    });
  });
  it('mantém um vínculo ativo, encerra o anterior ao confirmar a troca e preserva a conta ao desvincular', async () => {
    const { service, student, trainer, other, peer } = await fixture();
    service.activate(trainer.id);
    const invite = await service.issueInvite(trainer.id);
    service.activate(student.id);
    await service.confirm(student.id, invite.token, trainer.id);
    await service.confirm(student.id, other.publicCode!, other.id);
    expect(service.activeTrainer(student.id)).toEqual(trainer);
    service.activate(other.id);
    await service.respond(other.id, student.id, true);
    expect(service.linkedStudents(other.id)).toEqual([student]);
    service.activate(trainer.id);
    expect(service.linkedStudents(trainer.id)).toEqual([]);
    await expect(service.unlink(student.id, trainer.id)).rejects.toThrow();
    service.activate(peer.id);
    await expect(service.unlink(student.id, other.id)).rejects.toThrow();
    service.activate(student.id);
    await service.unlink(student.id, other.id);
    expect(service.activeTrainer(student.id)).toBeNull();
    expect(service.getAccount(student.id)).toEqual(student);
    service.activate(other.id);
    expect(service.linkedStudents(other.id)).toEqual([]);
  });
  it('lê códigos, links, fragmentos do standalone e endereços lidos pelo QR', () => {
    for (const value of [
      '  abc  ',
      'https://site.test/entrar#convite=abc',
      'https://site.test/index.html#/entrar?convite=abc',
      'file:///D:/demo/index.html#/entrar?convite=abc',
      '#/entrar?convite=abc',
    ])
      expect(inviteCredential(value)).toBe('abc');
    expect(inviteCredential('https://site.test/?outro=abc')).toBe('');
  });
});
