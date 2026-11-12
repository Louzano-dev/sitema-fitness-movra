import { Component, useEffect, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-600.css';
import 'movra:styles';
import { AppShell } from '@/components/app-shell';
import { DemoProvider } from '@/components/providers';
import { EmptyState } from '@/components/shared';
import { PersonalDashboard } from '@/features/personal/dashboard';
import { StudentsPage } from '@/features/personal/students';
import { StudentDetail } from '@/features/personal/student-detail';
import { WorkoutsPage } from '@/features/personal/workouts';
import { WorkoutEditor } from '@/features/personal/workout-editor';
import { ExercisesPage } from '@/features/personal/exercises';
import { AgendaPage } from '@/features/personal/agenda';
import { ProgressPage } from '@/features/progress';
import { SettingsPage } from '@/features/settings';
import { StudentHome, StudentWorkouts } from '@/features/student/home';
import { WorkoutSessionPage } from '@/features/student/workout-session';
import { HistoryPage } from '@/features/student/history';
import { AdminDashboard } from '@/features/admin/dashboard';
import { OrganizationsPage } from '@/features/admin/organizations';
import { PlansPage } from '@/features/admin/plans';
import { SubscriptionsPage } from '@/features/admin/subscriptions';
import type { Environment } from '@/domain/types';
import Link, { useLocation } from './router';
import { LoginPage } from '@/features/login';

class PortableErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="standalone">
          <h1>Não foi possível abrir esta tela.</h1>
          <p>Reabra o arquivo para reiniciar a demonstração com os dados iniciais.</p>
          <button className="button-link" onClick={() => window.location.reload()}>
            Reiniciar demonstração
          </button>
        </main>
      );
    return this.props.children;
  }
}

function RouteView({ path, query }: { path: string; query: URLSearchParams }) {
  if (path === '/entrar' || path === '/') return <LoginPage />;
  if (path === '/personal') return <PersonalDashboard />;
  if (path === '/personal/alunos') return <StudentsPage />;
  if (path === '/personal/treinos') return <WorkoutsPage />;
  if (path === '/personal/treinos/novo')
    return <WorkoutEditor initialStudent={query.get('aluno') ?? undefined} />;
  if (path === '/personal/exercicios') return <ExercisesPage />;
  if (path === '/personal/evolucao')
    return <ProgressPage initialStudent={query.get('aluno') ?? undefined} />;
  if (path === '/personal/agenda') return <AgendaPage />;
  if (path === '/personal/configuracoes') return <SettingsPage role="personal" />;
  if (path === '/aluno') return <StudentHome />;
  if (path === '/aluno/treinos') return <StudentWorkouts />;
  if (path === '/aluno/historico') return <HistoryPage />;
  if (path === '/aluno/evolucao') return <ProgressPage studentView />;
  if (path === '/aluno/perfil' || path === '/aluno/configuracoes')
    return <SettingsPage role="aluno" />;
  if (path === '/admin') return <AdminDashboard />;
  if (path === '/admin/organizacoes') return <OrganizationsPage />;
  if (path === '/admin/planos') return <PlansPage />;
  if (path === '/admin/assinaturas') return <SubscriptionsPage />;
  const student = path.match(/^\/personal\/alunos\/([^/]+)$/);
  if (student) return <StudentDetail id={decodeURIComponent(student[1])} />;
  const workout = path.match(/^\/personal\/treinos\/([^/]+)$/);
  if (workout) return <WorkoutEditor id={decodeURIComponent(workout[1])} />;
  const session = path.match(/^\/aluno\/treinos\/([^/]+)$/);
  if (session) return <WorkoutSessionPage id={decodeURIComponent(session[1])} />;
  return (
    <EmptyState
      title="Este caminho não foi encontrado."
      description="Retorne ao início do seu acompanhamento."
      action={
        <Link className="button-link" href="/personal">
          Ir para o início
        </Link>
      }
    />
  );
}

function PortableApp() {
  const location = useLocation();
  const [path, search = ''] = location.split('?');
  const role: Environment = path.startsWith('/aluno')
    ? 'aluno'
    : path.startsWith('/admin')
      ? 'admin'
      : 'personal';
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      const main = document.getElementById('main-content');
      const title = main?.querySelector('h1')?.textContent ?? 'Seu acompanhamento, de perto';
      document.title = `${title} · MOVRA`;
      main?.focus({ preventScroll: true });
      const status = document.getElementById('portable-route-status');
      if (status) status.textContent = title;
    });
    return () => cancelAnimationFrame(frame);
  }, [location]);
  return (
    <PortableErrorBoundary key={location}>
      {path === '/entrar' || path === '/' ? (
        <LoginPage />
      ) : (
        <AppShell role={role}>
          <RouteView key={location} path={path} query={new URLSearchParams(search)} />
        </AppShell>
      )}
      <div
        id="portable-route-status"
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />
    </PortableErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(
  <DemoProvider>
    <PortableApp />
  </DemoProvider>,
);
