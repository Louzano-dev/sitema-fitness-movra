'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Environment } from '@/domain/types';
import type { MovraRepository } from '@/services/repository';
type Session = { role: Environment; name: string };
type SessionValue = {
  session: Session | null;
  enter: (role: Environment, name: string, email?: string) => Promise<void>;
  leave: () => void;
};
const Context = createContext<SessionValue | null>(null);
export function DemoSessionProvider({
  children,
  repository,
}: {
  children: ReactNode;
  repository: MovraRepository;
}) {
  const [session, setSession] = useState<Session | null>(null);
  async function enter(role: Environment, name: string, email?: string) {
    const clean = name.trim();
    if (clean.length < 2 || clean.length > 80)
      throw new Error('Use um nome fictício de 2 a 80 caracteres.');
    repository.reset();
    await repository.saveProfile(role, {
      ...repository.getSnapshot().profiles[role],
      name: clean,
      email: email?.endsWith('@example.com') ? email : `${role}@example.com`,
    });
    setSession({ role, name: clean });
  }
  function leave() {
    repository.reset();
    setSession(null);
  }
  return <Context value={{ session, enter, leave }}>{children}</Context>;
}
export function useDemoSession() {
  const value = useContext(Context);
  if (!value) throw new Error('Sessão demonstrativa ausente.');
  return value;
}
