'use client';

import { useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ArrowRight, Clock3, Hash, Info } from 'lucide-react';
import { Brand } from '@/components/brand';
import { Avatar, Panel } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { professionalService } from '@/services/professional-service';
import { ConnectEntry } from './connect-entry';
import { InviteScanner } from './connect-qr';
import './connect.css';
import {
  connectService,
  inviteCredential,
  inviteStatus,
  type ConnectAccount,
} from '@/services/connect-service';

export const connectDemoNotice =
  'Demonstração local. Convites e vínculos funcionam neste navegador.';

function inviteUrls(token: string) {
  const location = window.location;
  const fragment = '#/entrar?convite=' + token;
  if (location.protocol === 'file:') {
    return fragment;
  }
  const portable = location.hash.startsWith('#/') || /\.html?$/i.test(location.pathname);
  return portable
    ? location.origin + location.pathname + fragment
    : location.origin + '/entrar#convite=' + token;
}

export function ConnectHeading({
  title,
  id,
  description,
}: {
  title: string;
  id: string;
  description?: string;
}) {
  return (
    <header className="connect-heading">
      <p className="connect-brand">
        <Brand compact /> MOVRA Connect
      </p>
      <h1 id={id}>{title}</h1>
      {description && <p>{description}</p>}
    </header>
  );
}

function useConnectAction() {
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  async function run(action: () => Promise<string>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setFailed(false);
    setMessage('');
    try {
      setMessage(await action());
    } catch (error) {
      setFailed(true);
      setMessage(
        error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.',
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return { busy, run, message, failed, clear: () => setMessage('') };
}

function useActiveAccount(account: ConnectAccount) {
  useSyncExternalStore(connectService.subscribe, connectService.revision, () => 0);
  return connectService.isActive(account.id);
}

async function copy(value: string) {
  if (!navigator.clipboard?.writeText)
    throw new Error('Selecione o texto do campo e copie manualmente.');
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    throw new Error('Selecione o texto do campo e copie manualmente.');
  }
  return 'Copiado.';
}

export function TrainerConnect({
  account,
  renderQr,
}: {
  account: ConnectAccount;
  renderQr?: (url: string) => ReactNode;
}) {
  const active = useActiveAccount(account);
  const { busy, run, message, failed } = useConnectAction();
  const [selected, select] = useState('');
  const [removing, setRemoving] = useState('');
  const [qr, setQr] = useState(false);
  const prefix = useId();
  if (!active || account.role !== 'personal') return null;
  const invites = connectService.listInvites(account.id);
  const requests = connectService.pendingStudents(account.id);
  const students = connectService.linkedStudents(account.id);
  const current = invites.find((invite) => invite.token === selected);
  const inviteUrl =
    current && inviteStatus(current) === 'Disponível' ? inviteUrls(current.token) : null;

  return (
    <Panel title="Convidar alunos" description={connectDemoNotice}>
      <div className="grid gap-4">
        <div className="grid gap-1">
          <label htmlFor={prefix + '-code'}>Código público do personal</label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id={prefix + '-code'}
              value={account.publicCode ?? ''}
              readOnly
              className="max-w-56"
            />
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => run(() => copy(account.publicCode ?? ''))}
            >
              Copiar código
            </Button>
          </div>
          <small>Quem usar seu código envia uma solicitação para você aprovar.</small>
        </div>
        <div>
          <Button
            disabled={busy}
            onClick={() =>
              run(async () => {
                const invite = await connectService.issueInvite(account.id);
                select(invite.token);
                setQr(false);
                return 'Convite individual criado. Válido por 24 horas, para um único aluno.';
              })
            }
          >
            Criar convite individual
          </Button>
        </div>
        {current && inviteUrl && (
          <div className="grid gap-2 border-l-2 border-current pl-3">
            <label htmlFor={prefix + '-link'}>Link do convite individual</label>
            <Input id={prefix + '-link'} value={inviteUrl} readOnly />
            <small>
              Uso único · vence em {new Date(current.expiresAt).toLocaleString('pt-BR')}
            </small>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" disabled={busy} onClick={() => run(() => copy(inviteUrl))}>
                Copiar link
              </Button>
              {renderQr && (
                <Button variant="outline" aria-expanded={qr} onClick={() => setQr(!qr)}>
                  {qr ? 'Ocultar QR Code' : 'Mostrar QR Code'}
                </Button>
              )}
            </div>
            {qr && renderQr?.(inviteUrl)}
            <a className="underline" href={inviteUrl} target="_blank" rel="noopener noreferrer">
              Abrir convite neste navegador
            </a>
          </div>
        )}
        {invites.length > 0 && (
          <details>
            <summary className="cursor-pointer py-2">Gerenciar convites ({invites.length})</summary>
            <ul className="grid gap-2">
              {invites.map((invite) => {
                const status = inviteStatus(invite);
                return (
                  <li key={invite.token} className="flex flex-wrap items-center gap-2">
                    <span>
                      Convite {invite.token.slice(-6)} · {status}
                    </span>
                    {status === 'Disponível' && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            select(invite.token);
                            setQr(false);
                          }}
                        >
                          Ver convite
                        </Button>
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              await connectService.revokeInvite(account.id, invite.token);
                              return 'Convite revogado.';
                            })
                          }
                        >
                          Revogar
                        </Button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        )}
        {requests.length > 0 && (
          <div>
            <h3>Solicitações de vínculo</h3>
            <ul className="grid gap-2">
              {requests.map((student) => (
                <li key={student.id} className="flex flex-wrap items-center gap-2">
                  <span>{student.name}</span>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await connectService.respond(account.id, student.id, true);
                        return 'Vínculo aprovado.';
                      })
                    }
                  >
                    Aprovar vínculo
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await connectService.respond(account.id, student.id, false);
                        return 'Solicitação recusada.';
                      })
                    }
                  >
                    Recusar
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {students.length > 0 && (
          <details>
            <summary className="cursor-pointer py-2">Alunos conectados ({students.length})</summary>
            <ul className="grid gap-2">
              {students.map((student) => (
                <li key={student.id} className="flex flex-wrap items-center gap-2">
                  <span>{student.name}</span>
                  {removing === student.id ? (
                    <>
                      <span>Encerrar o vínculo com {student.name}?</span>
                      <Button
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            await connectService.unlink(student.id, account.id);
                            setRemoving('');
                            return 'Vínculo encerrado. O aluno mantém seu histórico.';
                          })
                        }
                      >
                        Confirmar desvinculação
                      </Button>
                      <Button variant="outline" onClick={() => setRemoving('')}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" onClick={() => setRemoving(student.id)}>
                      Desvincular
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
        {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
      </div>
    </Panel>
  );
}

export function StudentConnect({
  account,
  initialCredential = '',
  embedded = false,
  onInvitationUsed,
}: {
  account?: ConnectAccount;
  initialCredential?: string;
  embedded?: boolean;
  onInvitationUsed?: () => void;
}) {
  useSyncExternalStore(connectService.subscribe, connectService.revision, () => 0);
  const { busy, run, message, failed, clear } = useConnectAction();
  const [action, setAction] = useState<'find' | 'confirm'>('find');
  const [credential, setCredential] = useState(() => inviteCredential(initialCredential));
  const [needsAccount, setNeedsAccount] = useState(false);
  const [candidate, setCandidate] = useState<Awaited<
    ReturnType<typeof professionalService.previewInvitation>
  > | null>(null);
  const [mode, setMode] = useState<'add' | 'replace'>('add');
  const [scannerKey, resetScanner] = useState(0);
  const prefix = useId();
  if (account && !connectService.isActive(account.id)) return null;
  const trainers = account ? connectService.activeTrainers(account.id) : [];
  const pending = account ? connectService.pendingTrainer(account.id) : null;
  const profile = candidate?.profile;
  const alreadyLinked = trainers.some((trainer) => trainer.id === candidate?.trainer.id);
  const alreadyRequested =
    !!pending && candidate?.method === 'public' && pending.id === candidate.trainer.id;

  function clearPreview() {
    clear();
    setCandidate(null);
    setNeedsAccount(false);
    setMode('add');
  }

  function preview(value: string) {
    clearPreview();
    setCredential(value);
    setAction('find');
    if (!account) {
      setNeedsAccount(true);
      return;
    }
    void run(async () => {
      setCandidate(await professionalService.previewInvitation(account.id, value));
      return '';
    });
  }

  function feedback(forAction: typeof action) {
    if (action !== forAction || !message) return null;
    return (
      <p
        id={prefix + '-feedback'}
        className="connect-note"
        data-error={failed}
        role={failed ? 'alert' : 'status'}
      >
        {message}
        {failed &&
          forAction === 'find' &&
          !message.includes('tentativas') &&
          ' Confira o código ou peça um novo convite.'}
      </p>
    );
  }

  return (
    <section
      className={embedded ? 'connect-embedded' : 'student-connect'}
      aria-labelledby={embedded ? undefined : prefix + '-title'}
    >
      {!embedded && (
        <ConnectHeading
          id={prefix + '-title'}
          title="Conecte-se ao seu personal"
          description="Use o código, o link ou o QR Code que seu personal compartilhou com você."
        />
      )}
      <div className="connect-body">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (busy) return;
            resetScanner((value) => value + 1);
            preview(credential.trim());
          }}
        >
          <label htmlFor={prefix + '-credential'}>Código ou link do personal</label>
          <div className="connect-lookup">
            <div className="connect-input">
              <Hash size={19} aria-hidden />
              <Input
                id={prefix + '-credential'}
                placeholder="MOVRA-XXXXXXXX"
                value={credential}
                disabled={busy}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                required
                pattern=".*\S.*"
                maxLength={4096}
                aria-invalid={action === 'find' && failed && !!message}
                aria-describedby={action === 'find' && message ? prefix + '-feedback' : undefined}
                onChange={(event) => {
                  setCredential(event.target.value);
                  clearPreview();
                  resetScanner((value) => value + 1);
                }}
              />
            </div>
            <Button className="connect-primary" type="submit" disabled={busy}>
              {busy && action === 'find' ? 'Consultando convite…' : 'Consultar convite'}
              <ArrowRight size={17} aria-hidden />
            </Button>
          </div>
          {feedback('find')}
        </form>
        <InviteScanner key={scannerKey} disabled={busy} onStart={clearPreview} onScan={preview} />
        {!account && (
          <div className={needsAccount ? 'connect-result' : 'connect-account'}>
            {needsAccount && (
              <p role="status">Abra uma conta local de aluno para consultar este convite.</p>
            )}
            <ConnectEntry
              key={String(needsAccount)}
              role="aluno"
              credential={needsAccount ? credential : ''}
            />
          </div>
        )}
        {candidate && account && (
          <div className="connect-result" aria-label="Resultado da consulta">
            <div className="connect-identity">
              {profile?.photo ? (
                // User-provided thumbnail is embedded for offline use.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.photo} alt="" width={52} height={52} />
              ) : (
                <Avatar name={candidate.trainer.name} />
              )}
              <div>
                <h2>{profile?.name || candidate.trainer.name}</h2>
                {profile?.specialties && <p>{profile.specialties}</p>}
              </div>
            </div>
            {alreadyLinked ? (
              <p role="status">Você já está conectado a este personal.</p>
            ) : alreadyRequested ? (
              <p role="status">Você já enviou uma solicitação a este personal.</p>
            ) : (
              <>
                <p role="status">
                  {candidate.method === 'public'
                    ? 'Confira o perfil. Ao confirmar, o personal receberá sua solicitação de vínculo.'
                    : 'Confira o perfil. Ao confirmar, você aceitará o convite individual deste personal.'}
                </p>
                {trainers.length > 0 && (
                  <label className="connect-mode">
                    Acompanhamentos existentes
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value === 'replace' ? 'replace' : 'add')}
                    >
                      <option value="add">Manter meus outros vínculos</option>
                      <option value="replace">Encerrar meus vínculos anteriores</option>
                    </select>
                  </label>
                )}
                <Button
                  className="connect-primary"
                  disabled={busy}
                  onClick={() => {
                    setAction('confirm');
                    void run(async () => {
                      const result = await connectService.confirm(
                        account.id,
                        credential,
                        candidate.trainer.id,
                        mode,
                      );
                      setCandidate(null);
                      setCredential('');
                      onInvitationUsed?.();
                      return result === 'public'
                        ? 'Solicitação enviada ao personal.'
                        : 'Vínculo confirmado.';
                    });
                  }}
                >
                  {busy && action === 'confirm' ? 'Conectando…' : 'Conectar com este personal'}
                </Button>
              </>
            )}
          </div>
        )}
        {feedback('confirm')}
        {!embedded && account && <PendingRequest account={account} />}
      </div>
      {!embedded && <ConnectFooter />}
    </section>
  );
}

export function PendingRequest({ account }: { account: ConnectAccount }) {
  const { busy, run, message, failed } = useConnectAction();
  const active = useActiveAccount(account);
  if (!active) return null;
  const pending = connectService.pendingTrainer(account.id);
  return (
    <>
      {pending && (
        <div className="connect-pending">
          <p>
            <Clock3 size={17} aria-hidden /> Aguardando aprovação de {pending.name}.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await connectService.cancelRequest(account.id);
                return 'Solicitação cancelada.';
              })
            }
          >
            Cancelar solicitação
          </Button>
        </div>
      )}
      {message && (
        <p className="connect-note" data-error={failed} role={failed ? 'alert' : 'status'}>
          {message}
        </p>
      )}
    </>
  );
}

export function ConnectFooter() {
  return (
    <footer className="connect-footer">
      <p>
        <Info size={15} aria-hidden /> {connectDemoNotice}
      </p>
    </footer>
  );
}
