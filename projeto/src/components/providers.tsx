'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { MovraRepository } from '@/services/repository';
import { MockRepository } from '@/services/mock/repository';
import { DemoSessionProvider, useDemoSession } from './demo-session';
import { openConnectWorkspace, workspaceStorage } from '@/services/connect-workspace';
import { connectService, type ConnectAccount } from '@/services/connect-service';
import { startConversationRetention } from '@/services/messaging-service';
import { Button } from './ui/button';
const RepositoryContext = createContext<MovraRepository | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [repository] = useState(() => new MockRepository());
  useEffect(() => startConversationRetention(), []);
  useEffect(() => {
    try {
      repository.attachStorage(window.localStorage);
    } catch {
      repository.attachStorage();
    }
  }, [repository]);
  return (
    <RepositoryContext value={repository}>
      <DemoSessionProvider repository={repository}>
        <AccountWorkspace>{children}</AccountWorkspace>
      </DemoSessionProvider>
    </RepositoryContext>
  );
}
function AccountWorkspace({ children }: { children: ReactNode }) {
  const { session } = useDemoSession();
  const account = session?.account;
  const members = useSyncExternalStore(
    connectService.subscribe,
    () =>
      !account
        ? ''
        : account.role === 'personal'
          ? connectService
              .linkedStudents(account.id)
              .map((s) => s.id)
              .sort()
              .join(',')
          : connectService.activeTrainers(account.id).map(t => t.id).join(','),
    () => '',
  );
  return account ? (
    <LocalWorkspace key={account.id + ':' + members} account={account}>
      {children}
    </LocalWorkspace>
  ) : (
    children
  );
}
function LocalWorkspace({ account, children }: { account: ConnectAccount; children: ReactNode }) {
  const [outdated, setOutdated] = useState(false);
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!event.key?.startsWith('movra:connect:workspace:') || event.oldValue === event.newValue)
        return;
      const id = event.key.slice('movra:connect:workspace:'.length);
      if (
        id === account.id ||
        (account.role === 'personal' &&
          connectService.linkedStudents(account.id).some((s) => s.id === id))
      )
        setOutdated(true);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [account]);
  return (
    <>
      {outdated && (
        <aside className="form-actions" aria-label="Atualização local">
          <span role="status">
            Há dados novos em outra aba. Salve sua edição antes de atualizar.
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEpoch((n) => n + 1);
              setOutdated(false);
            }}
          >
            Atualizar dados
          </Button>
        </aside>
      )}
      <WorkspaceData account={account} key={epoch}>
        {children}
      </WorkspaceData>
    </>
  );
}
function WorkspaceData({ account, children }: { account: ConnectAccount; children: ReactNode }) {
  const [repository] = useState(() => openConnectWorkspace(account, workspaceStorage()));
  return <RepositoryContext value={repository}>{children}</RepositoryContext>;
}
export function useRepository() {
  const repository = useContext(RepositoryContext);
  if (!repository) throw new Error('DemoProvider ausente.');
  return repository;
}
export function useDemo() {
  const repository = useRepository();
  return useSyncExternalStore(repository.subscribe, repository.getSnapshot, repository.getSnapshot);
}
