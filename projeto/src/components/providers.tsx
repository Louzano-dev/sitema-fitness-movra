'use client';
import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { MovraRepository } from '@/services/repository';
import { MockRepository } from '@/services/mock/repository';
import { DemoSessionProvider } from './demo-session';
const RepositoryContext = createContext<MovraRepository | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [repository] = useState(() => new MockRepository());
  return (
    <RepositoryContext value={repository}>
      <DemoSessionProvider repository={repository}>{children}</DemoSessionProvider>
    </RepositoryContext>
  );
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
