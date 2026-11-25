'use client';
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { useDemoSession } from './demo-session';
import { GuideProvider, GuideToggle, PageGuide } from './guided-mode';
import { PageMotion } from './motion';
import { usePremiumShell } from './premium-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  BookOpen,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun,
  Users,
  Wallet,
  UserRound,
  House,
  WandSparkles,
} from 'lucide-react';
import { connectService } from '@/services/connect-service';
import { linkAllows, professionalService } from '@/services/professional-service';
import { Brand } from './brand';
import { Avatar } from './shared';
import { useDemo } from './providers';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import type { Environment } from '@/domain/types';
import { cn } from '@/lib/utils';
const navigation = {
  personal: [
    { href: '/personal', label: 'Visão geral', icon: LayoutDashboard },
    { href: '/personal/alunos', label: 'Alunos', icon: Users },
    { href: '/personal/treinos', label: 'Treinos', icon: ClipboardList },
    { href: '/personal/studio', label: 'MOVRA Studio', icon: WandSparkles },
    { href: '/personal/exercicios', label: 'Exercícios', icon: BookOpen },
    { href: '/personal/agenda', label: 'Agenda', icon: CalendarDays },
    { href: '/personal/evolucao', label: 'Evolução física', icon: ChartNoAxesCombined },
    { href: '/personal/negocio', label: 'Perfil profissional', icon: UserRound },
  ],
  aluno: [
    { href: '/aluno', label: 'Início', icon: House },
    { href: '/aluno/treinos', label: 'Meus treinos', icon: ClipboardList },
    { href: '/aluno/evolucao', label: 'Evolução', icon: Activity },
    { href: '/aluno/personal', label: 'Meu personal', icon: Users },
    { href: '/aluno/perfil', label: 'Meu perfil', icon: UserRound },
    { href: '/aluno/agenda', label: 'Agenda', icon: CalendarDays },
  ],
  admin: [
    { href: '/admin', label: 'Operação', icon: LayoutDashboard },
    { href: '/admin/organizacoes', label: 'Organizações', icon: Building2 },
    { href: '/admin/planos', label: 'Planos', icon: Wallet },
    { href: '/admin/assinaturas', label: 'Assinaturas', icon: CreditCard },
  ],
};
const labels = { personal: 'Espaço do personal', aluno: 'Espaço do aluno', admin: 'Administração' };
function AccountMenu({
  name,
  onLeave,
  onSwitch,
  children,
}: {
  name: string;
  onLeave: () => void;
  onSwitch: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>
            Perfil demonstrativo · sem autenticação real. Trocar perfil preserva os registros
            locais. Sair encerra a visualização; os registros fictícios permanecem neste navegador.
          </DialogDescription>
        </DialogHeader>
        <Button variant="outline" onClick={onSwitch}>
          Trocar perfil
        </Button>
        <Button onClick={onLeave}>Sair da demonstração</Button>
      </DialogContent>
    </Dialog>
  );
}
export function AppShell({ role, children }: { role: Environment; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const {
    sidebar: sidebarRef,
    compact,
    setCompact,
    theme,
    setTheme,
    ready,
    onNavigate,
  } = usePremiumShell(path, (href) => router.push(href));
  const { session, studentId, leave, switchProfile } = useDemoSession();
  useEffect(() => {
    if (!session || session.role !== role) router.replace('/entrar');
  }, [session, role, router]);
  const data = useDemo();
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerDestination = useRef<string | null>(null);
  function closeDrawerForNavigation(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (
      !event.currentTarget.closest('.mobile-drawer') ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    drawerDestination.current = href === path ? null : href;
    setMenuOpen(false);
  }
  useSyncExternalStore(professionalService.subscribe, professionalService.revision, () => 0);
  const showAgenda =
    role !== 'aluno' ||
    !session?.account ||
    data.appointments.some((a) => a.studentId === studentId) ||
    connectService
      .professionalLinks(studentId)
      .some(
        (l) =>
          l.endedAt === null && linkAllows(l.trainerId, studentId, 'appointments', l.startedAt),
      );
  const items = navigation[role].filter((item) => item.href !== '/aluno/agenda' || showAgenda);
  const current =
    [...items]
      .reverse()
      .find(
        (item) => path === item.href || (item.href !== `/${role}` && path.startsWith(item.href)),
      ) ?? items[0];
  const profile = data.profiles[role];
  const leaveAccount = () => {
    setMenuOpen(false);
    leave();
    router.push('/entrar');
  };
  const changeProfile = (next?: Environment) => {
    setMenuOpen(false);
    switchProfile(next);
    router.push('/entrar');
  };
  const links = (
    <nav className="sidebar-nav" aria-label={`Navegação · ${labels[role]}`}>
      <span className="sidebar-active-track" aria-hidden="true" />
      {items.map(({ href, label, icon: Icon }) => {
        const active = path === href || (href !== `/${role}` && path.startsWith(`${href}/`));
        const section = href === '/personal/treinos' ? 'Planejamento' : undefined;
        return (
          <Fragment key={href}>
            {section && <span className="nav-section">{section}</span>}
            <Link
              href={href}
              aria-label={label}
              aria-description={href.endsWith('/studio') ? 'Criar e editar treinos' : undefined}
              data-tooltip={label}
              title={label}
              onFocus={(e) =>
                e.currentTarget.style.setProperty(
                  '--tooltip-y',
                  `${e.currentTarget.getBoundingClientRect().top}px`,
                )
              }
              onMouseEnter={(e) =>
                e.currentTarget.style.setProperty(
                  '--tooltip-y',
                  `${e.currentTarget.getBoundingClientRect().top}px`,
                )
              }
              aria-current={active ? 'page' : undefined}
              className={cn('sidebar-link', active && 'active')}
              onClick={(event) => closeDrawerForNavigation(event, href)}
            >
              <Icon size={19} aria-hidden />
              <span>
                {label}
                {href.endsWith('/studio') && (
                  <small className="nav-purpose">Criar e editar treinos</small>
                )}
              </span>
              {active && <span className="nav-active-dot" />}
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
  const sidebar = (
    <>
      <Link
        href={`/${role}`}
        className="sidebar-brand"
        aria-label="MOVRA, início do ambiente"
        onClick={(event) => closeDrawerForNavigation(event, `/${role}`)}
      >
        <Brand />
      </Link>
      <div className="environment-label">{labels[role]}</div>
      {links}
      <div className="sidebar-bottom">
        <p className="role-label">Visualizar demonstração como</p>
        <div className="environment-select">
          <select
            aria-label="Trocar ambiente demonstrativo"
            value={role}
            onChange={(event) => changeProfile(event.target.value as Environment)}
          >
            <option value="personal">Personal trainer</option>
            <option value="aluno">Aluno / atleta</option>
            <option value="admin">Administrador</option>
          </select>
          <ChevronDown size={15} aria-hidden />
        </div>
        <p className="role-warning">Troca de visualização, sem autenticação.</p>
        <AccountMenu name={profile.name} onLeave={leaveAccount} onSwitch={() => changeProfile()}>
          <button className="sidebar-profile account-trigger" aria-label="Abrir menu do usuário">
            <Avatar name={profile.name} />
            <div>
              <strong>{profile.name}</strong>
              <span>
                {role === 'personal' && !session?.account ? 'Estúdio Horizonte' : labels[role]}
              </span>
            </div>
          </button>
        </AccountMenu>
      </div>
    </>
  );
  if (!session || session.role !== role)
    return (
      <div className="standalone" role="status">
        Retornando à entrada demonstrativa…
      </div>
    );
  return (
    <GuideProvider
      key={role === 'aluno' ? studentId : role}
      owner={role === 'aluno' ? studentId : role}
    >
      <div
        className={cn(
          'app-shell',
          `environment-${role}`,
          compact && 'sidebar-compact',
          ready && 'appearance-ready',
        )}
        onClickCapture={onNavigate}
      >
        <a
          className="skip-link"
          href="#main-content"
          onClick={(event) => {
            event.preventDefault();
            const main = document.getElementById('main-content');
            main?.focus();
            main?.scrollIntoView();
          }}
        >
          Pular para o conteúdo
        </a>
        <aside ref={sidebarRef} className="sidebar desktop-sidebar">
          <Button
            variant="ghost"
            size="icon"
            className="sidebar-collapse"
            aria-label={compact ? 'Expandir navegação' : 'Recolher navegação'}
            aria-expanded={!compact}
            onClick={() => setCompact(!compact)}
          >
            {compact ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </Button>
          {sidebar}
        </aside>
        <div className="workspace">
          <header className="topbar">
            <Button
              variant="ghost"
              size="icon"
              className="theme-switch"
              aria-label={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            </Button>
            <div className="breadcrumb">
              <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mobile-menu"
                    aria-label="Abrir menu"
                  >
                    <Menu />
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className="mobile-drawer translate-x-0! translate-y-0!"
                  onCloseAutoFocus={(event) => {
                    const destination = drawerDestination.current;
                    if (!destination) return;
                    drawerDestination.current = null;
                    event.preventDefault();
                    router.push(destination);
                  }}
                >
                  <DialogHeader className="sr-only">
                    <DialogTitle>Navegação MOVRA</DialogTitle>
                    <DialogDescription>
                      Escolha uma página ou ambiente demonstrativo.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="sidebar">{menuOpen && sidebar}</div>
                </DialogContent>
              </Dialog>
              <span className="breadcrumb-environment">{labels[role]}</span>
              <ChevronRight size={14} aria-hidden />
              <span>{current.label}</span>
            </div>
            <div className="topbar-actions">
              <span className="demo-pill">
                <span />
                Demonstração
              </span>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Sobre esta demonstração">
                    <HelpCircle size={19} />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Um espaço para experimentar.</DialogTitle>
                    <DialogDescription>
                      Todos os dados são fictícios. Você pode navegar, criar e editar registros
                      locais. Os registros persistem no navegador, sem armazenamento seguro. Sem
                      autenticação, pagamentos, IA ou proteção de dados de produção.
                    </DialogDescription>
                  </DialogHeader>
                  <p className="muted small">
                    A data de referência dos exemplos é 12 de novembro de 2026.
                  </p>
                </DialogContent>
              </Dialog>
              <AccountMenu
                name={profile.name}
                onLeave={leaveAccount}
                onSwitch={() => changeProfile()}
              >
                <Button variant="ghost" size="icon" aria-label={`Conta de ${profile.name}`}>
                  <Avatar name={profile.name} small />
                </Button>
              </AccountMenu>
            </div>
          </header>
          <div className="demo-strip">
            <span>
              Prévia local ·{' '}
              {data.storageState === 'local'
                ? 'dados salvos no navegador'
                : data.storageState === 'invalid'
                  ? 'armazenamento inválido; use redefinir dados'
                  : data.storageState === 'unavailable'
                    ? 'sem persistência disponível'
                    : 'iniciando armazenamento'}
            </span>
            <GuideToggle />
          </div>
          <main id="main-content" className="page-content" tabIndex={-1}>
            <PageMotion route={path}>
              <PageGuide path={path} />
              {children}
            </PageMotion>
          </main>
          <footer className="workspace-footer">
            <span>MOVRA · Cada treino, um próximo passo.</span>
            <span>Dados fictícios locais · sessão sem autenticação</span>
          </footer>
        </div>
        {role === 'aluno' && (
          <nav className="student-bottom-nav" aria-label="Navegação rápida do aluno">
            {navigation.aluno
              .filter((i) =>
                [
                  '/aluno',
                  '/aluno/treinos',
                  '/aluno/personal',
                  '/aluno/evolucao',
                  '/aluno/perfil',
                ].includes(i.href),
              )
              .map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>
                  <Icon size={21} aria-hidden />
                  <span>{label}</span>
                </Link>
              ))}
          </nav>
        )}
      </div>
    </GuideProvider>
  );
}
