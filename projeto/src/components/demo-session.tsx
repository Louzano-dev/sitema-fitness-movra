'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { STUDENT_ID, type Environment } from '@/domain/types';
import type { MovraRepository } from '@/services/repository';
import { connectService, type ConnectAccount } from '@/services/connect-service';
type Session = { role: Environment; name: string; account?: ConnectAccount; invitation?: string };
type SessionValue = {
  session: Session | null;
  suggestedRole: Environment;
  studentId: string;
  switchProfile: (role?: Environment) => void;
  enter: (role: Environment, name: string, email?: string, studentId?: string) => Promise<void>;
  enterAccount: (account: ConnectAccount, invitation?: string) => void;
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
  const [studentId, setStudentId] = useState(STUDENT_ID);
  const [suggestedRole, setSuggestedRole] = useState<Environment>('personal');
  async function enter(role: Environment, name: string, email?: string, selectedId = studentId) {
    const clean = name.trim();
    if (clean.length < 2 || clean.length > 100)
      throw new Error('Use um nome fictício de 2 a 100 caracteres.');
    const selected = repository.getSnapshot().students.find((s) => s.id === selectedId);
    if (role === 'aluno' && !selected) throw new Error('Aluno demonstrativo não encontrado.');
    setStudentId(selectedId);
    await repository.saveProfile(
      role,
      {
        ...repository.getSnapshot().profiles[role],
        name: clean,
        email: email?.endsWith('@example.com')
          ? email
          : role === 'aluno'
            ? selected!.email
            : repository.getSnapshot().profiles[role].email,
        specialty:
          role === 'aluno' ? selected!.goal : repository.getSnapshot().profiles[role].specialty,
      },
      selectedId,
    );
    connectService.activate(null);
    setSession({ role, name: clean });
  }
  function enterAccount(account: ConnectAccount, invitation?: string) {
    connectService.activate(account.id);
    setStudentId(account.role === 'aluno' ? account.id : STUDENT_ID);
    setSession({ role: account.role, name: account.name, account, invitation });
  }
  function leave() {
    connectService.activate(null);
    setSession(null);
    setStudentId(STUDENT_ID);
    setSuggestedRole('personal');
  }
  function switchProfile(role: Environment = session?.role === 'personal' ? 'aluno' : 'personal') {
    connectService.activate(null);
    setStudentId(STUDENT_ID);
    setSuggestedRole(role);
    setSession(null);
  }
  return (
    <Context
      value={{ session, suggestedRole, studentId, enter, enterAccount, switchProfile, leave }}
    >
      {children}
    </Context>
  );
}
export function useDemoSession() {
  const value = useContext(Context);
  if (!value) throw new Error('Sessão demonstrativa ausente.');
  return value;
}
