'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useDemoSession } from './demo-session';
import { PageMotion } from './motion';
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
  Settings2,
  ShieldCheck,
  Users,
  Wallet,
  History,
  UserRound,
  House,
} from 'lucide-react';
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
    { href: '/personal/exercicios', label: 'Exercícios', icon: BookOpen },
    { href: '/personal/evolucao', label: 'Evolução física', icon: ChartNoAxesCombined },
    { href: '/personal/agenda', label: 'Agenda', icon: CalendarDays },
    { href: '/personal/configuracoes', label: 'Configurações', icon: Settings2 },
  ],
  aluno: [
    { href: '/aluno', label: 'Hoje', icon: House },
    { href: '/aluno/treinos', label: 'Meus treinos', icon: ClipboardList },
    { href: '/aluno/historico', label: 'Histórico', icon: History },
    { href: '/aluno/evolucao', label: 'Evolução', icon: Activity },
    { href: '/aluno/perfil', label: 'Meu perfil', icon: UserRound },
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
  children,
}: {
  name: string;
  onLeave: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>
            Perfil demonstrativo · sem autenticação real. Sair ou trocar perfil limpa todas as
            alterações desta sessão.
          </DialogDescription>
        </DialogHeader>
        <Button variant="outline" onClick={onLeave}>
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
  const { session, leave } = useDemoSession();
  useEffect(() => {
    if (!session || session.role !== role) router.replace('/entrar');
  }, [session, role, router]);
  const data = useDemo();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = navigation[role];
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
  const links = (
    <nav className="sidebar-nav" aria-label={`Navegação · ${labels[role]}`}>
      {items.map(({ href, label, icon: Icon }) => {
        const active = path === href || (href !== `/${role}` && path.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn('sidebar-link', active && 'active')}
            onClick={() => setMenuOpen(false)}
          >
            <Icon size={19} aria-hidden />
            <span>{label}</span>
            {active && <span className="nav-active-dot" />}
          </Link>
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
        onClick={() => setMenuOpen(false)}
      >
        <Brand />
      </Link>
      <div className="environment-label">{labels[role]}</div>
      {links}
      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <span className="sidebar-note-icon">
            <ShieldCheck size={18} aria-hidden />
          </span>
          <p>
            Seu cuidado,
            <br />
            <strong>presente em cada treino.</strong>
          </p>
        </div>
        <p className="role-label">Visualizar demonstração como</p>
        <div className="environment-select">
          <select
            aria-label="Trocar ambiente demonstrativo"
            value={role}
            onChange={() => {
              setMenuOpen(false);
              leave();
              router.push('/entrar');
            }}
          >
            <option value="personal">Personal trainer</option>
            <option value="aluno">Aluno / atleta</option>
            <option value="admin">Administrador</option>
          </select>
          <ChevronDown size={15} aria-hidden />
        </div>
        <p className="role-warning">Troca de visualização, sem autenticação.</p>
        <AccountMenu name={profile.name} onLeave={leaveAccount}>
          <button className="sidebar-profile account-trigger" aria-label="Abrir menu do usuário">
            <Avatar name={profile.name} />
            <div>
              <strong>{profile.name}</strong>
              <span>{role === 'personal' ? 'Estúdio Horizonte' : labels[role]}</span>
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
    <div className={cn('app-shell', `environment-${role}`)}>
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
      <aside className="sidebar desktop-sidebar">{sidebar}</aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="mobile-menu" aria-label="Abrir menu">
                  <Menu />
                </Button>
              </DialogTrigger>
              <DialogContent className="mobile-drawer">
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
                    locais. Recarregar reinicia as alterações. Sem autenticação, pagamentos, IA ou
                    proteção de dados de produção.
                  </DialogDescription>
                </DialogHeader>
                <p className="muted small">
                  A data de referência dos exemplos é 12 de novembro de 2026.
                </p>
              </DialogContent>
            </Dialog>
            <AccountMenu name={profile.name} onLeave={leaveAccount}>
              <Button variant="ghost" size="icon" aria-label={`Conta de ${profile.name}`}>
                <Avatar name={profile.name} small />
              </Button>
            </AccountMenu>
          </div>
        </header>
        <div className="demo-strip">
          <span>Prévia funcional · dados em memória</span>
          <span>
            12 nov 2026 <span className="desktop-only">· dia demonstrativo</span>
          </span>
        </div>
        <main id="main-content" className="page-content" tabIndex={-1}>
          <PageMotion route={path}>{children}</PageMotion>
        </main>
        <footer className="workspace-footer">
          <span>MOVRA · Cada treino, um próximo passo.</span>
          <span>Dados fictícios · recarregar reinicia a sessão</span>
        </footer>
      </div>
      {role === 'aluno' && (
        <nav className="student-bottom-nav" aria-label="Navegação rápida do aluno">
          {navigation.aluno
            .filter((i) => i.href !== '/aluno/treinos')
            .map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>
                <Icon size={21} aria-hidden />
                <span>{label}</span>
              </Link>
            ))}
        </nav>
      )}
    </div>
  );
}
