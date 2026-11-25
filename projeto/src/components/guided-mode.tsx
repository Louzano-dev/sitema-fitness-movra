'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Compass } from 'lucide-react';
import { Button } from './ui/button';

const Guide = createContext({
  enabled: false,
  toggle: () => {},
  dismissed: [] as string[],
  dismiss: (_key: string) => {
    void _key;
  },
});
export const useGuide = () => useContext(Guide);

export function GuideProvider({ owner, children }: { owner: string; children: ReactNode }) {
  const key = 'movra:guide:1:' + owner;
  const [settings, setSettings] = useState({ enabled: false, dismissed: [] as string[] });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const value = JSON.parse(localStorage.getItem(key) ?? '{}');
        setSettings({
          enabled: value?.enabled === true,
          dismissed: Array.isArray(value?.dismissed)
            ? value.dismissed.filter((item: unknown) => typeof item === 'string')
            : [],
        });
      } catch {}
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [key]);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(key, JSON.stringify(settings));
      } catch {}
    }
  }, [settings, ready, key]);
  return (
    <Guide.Provider
      value={{
        ...settings,
        toggle: () => setSettings((s) => ({ ...s, enabled: !s.enabled })),
        dismiss: (topic) => setSettings((s) => ({ ...s, dismissed: [...s.dismissed, topic] })),
      }}
    >
      {children}
    </Guide.Provider>
  );
}

export function GuideToggle() {
  const guide = useGuide();
  return (
    <button
      type="button"
      className="guide-toggle"
      aria-pressed={guide.enabled}
      onClick={guide.toggle}
    >
      <Compass size={17} aria-hidden /> Modo guiado{' '}
      <strong aria-hidden>{guide.enabled ? 'Ativo' : 'Ativar'}</strong>
    </button>
  );
}

export function GuideHint({ topic, children }: { topic: string; children: ReactNode }) {
  const guide = useGuide();
  if (!guide.enabled || guide.dismissed.includes(topic)) return null;
  return (
    <aside aria-label="Orientação da tarefa" className="guide-hint">
      <Compass size={20} aria-hidden />
      <p>{children}</p>
      <Button variant="ghost" onClick={() => guide.dismiss(topic)}>
        Dispensar dica
      </Button>
    </aside>
  );
}

const instructions: Record<string, string> = {
  '/personal':
    'Use Criar treino para preparar uma ficha. Na agenda, selecione o nome de um aluno para abrir seu perfil.',
  '/personal/alunos':
    'Para começar um acompanhamento, cadastre o aluno. Você pode revisar os dados no perfil depois.',
  '/personal/treinos': 'Abra uma ficha para editar ou escolha Criar treino para começar uma nova.',
  '/personal/evolucao': 'Selecione o aluno e a data antes de registrar uma avaliação.',
  '/personal/agenda': 'Escolha o horário e o aluno para agendar um encontro.',
  '/personal/exercicios':
    'Pesquise pelo nome ou grupo muscular. Abra as instruções para consultar a execução.',
  '/aluno':
    'Abra o treino do dia. Durante a sessão, você poderá ajustar a carga e registrar cada série.',
  '/aluno/treinos': 'Escolha uma ficha e use Iniciar treino para ver as orientações do personal.',
  '/aluno/historico': 'Abra uma sessão para rever os exercícios e as séries registradas.',
  '/aluno/personal': 'Consulte o código, link ou QR recebido do seu personal e confirme o vínculo.',
  '/aluno/evolucao': 'Consulte as medidas registradas ao longo do acompanhamento.',
  '/admin': 'Consulte as organizações, planos e assinaturas pelo menu de navegação.',
};
export function PageGuide({ path }: { path: string }) {
  const help =
    instructions[path] ??
    (path.startsWith('/aluno/treinos/')
      ? 'Leia as orientações, ajuste carga e repetições e marque a série realizada. Você pode desmarcá-la para corrigir o registro.'
      : path.startsWith('/personal/treinos/')
        ? 'Escolha o aluno e os exercícios. Revise a ficha para conferir o que será enviado.'
        : undefined);
  return help ? <GuideHint topic={path}>{help}</GuideHint> : null;
}
