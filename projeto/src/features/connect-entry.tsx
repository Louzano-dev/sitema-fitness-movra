'use client';
import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useDemoSession } from '@/components/demo-session';
import { connectService, type ConnectAccount } from '@/services/connect-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Feedback } from '@/components/shared';

function invitation() {
  const fragment = location.hash.slice(1);
  return (
    new URLSearchParams(fragment.startsWith('/entrar?') ? fragment.slice(8) : fragment).get(
      'convite',
    ) ??
    new URLSearchParams(location.search).get('convite') ??
    ''
  );
}
function subscribeHash(callback: () => void) {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

export function ConnectEntry({
  role,
  credential,
}: {
  role: 'aluno' | 'personal';
  credential?: string;
}) {
  const linkToken = useSyncExternalStore(subscribeHash, invitation, () => '');
  const token = credential ?? linkToken;
  const [opened, setOpened] = useState(!!credential);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { enterAccount } = useDemoSession();
  const router = useRouter();
  const effectiveRole = token ? 'aluno' : role;
  function open(account: ConnectAccount) {
    enterAccount(account, token || undefined);
    router.push(
      account.role === 'aluno' && (token || credential !== undefined)
        ? '/aluno/personal'
        : '/' + account.role,
    );
  }
  return (
    <details
      className="connect-entry"
      open={opened || !!token}
      onToggle={(e) => setOpened(e.currentTarget.open)}
    >
      <summary>
        {credential
          ? 'Escolher uma conta de aluno'
          : token
            ? 'Aceitar convite como aluno'
            : 'Criar ou abrir conta local · MOVRA Connect'}
      </summary>
      {(opened || token) && (
        <>
          <p>
            Perfis fictícios neste navegador. Qualquer pessoa neste aparelho pode selecioná-los.
          </p>
          {connectService
            .listAccounts()
            .filter((a) => a.role === effectiveRole)
            .map((account) => (
              <Button
                type="button"
                key={account.id}
                variant="outline"
                onClick={() => open(account)}
              >
                Abrir conta de {account.name}
              </Button>
            ))}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              setError('');
              try {
                open(await connectService.createAccount(effectiveRole, name.trim()));
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : 'Falha ao cadastrar.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Nome da nova conta local" htmlFor="connect-signup-name">
              <Input
                id="connect-signup-name"
                minLength={2}
                maxLength={100}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={busy}>
              Criar conta de {effectiveRole === 'personal' ? 'personal' : 'aluno'}
            </Button>
            <Feedback error={error} />
          </form>
        </>
      )}
    </details>
  );
}
