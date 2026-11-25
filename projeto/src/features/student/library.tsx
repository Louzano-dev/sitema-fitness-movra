'use client';
import { useState } from 'react';
import { Archive, Bookmark, Check, Ellipsis, Star } from 'lucide-react';
import { useDemoSession } from '@/components/demo-session';
import { useDemo, useRepository } from '@/components/providers';
import { PageHeader, EmptyState, Panel } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { WorkoutCards } from '@/features/personal/workouts';
import { HistoryPage } from './history';
import {
  emptyLibrary,
  libraryGroups,
  changeLibrary,
  type LibraryAction,
} from '@/domain/student-library';

const tabs = ['Em uso', 'Salvos', 'Histórico'] as const;
const pageSize = 6;
export function StudentWorkouts() {
  const { studentId } = useDemoSession();
  const data = useDemo();
  const repo = useRepository();
  const [tab, setTab] = useState<(typeof tabs)[number]>('Em uso');
  const [trainer, setTrainer] = useState('');
  const [goal, setGoal] = useState('');
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState('');
  const [notice, setNotice] = useState('');
  const [undo, setUndo] = useState<{
    key: string;
    status: 'active' | 'saved' | 'archived';
    main: boolean;
  } | null>(null);
  const library = data.experience.libraries?.[studentId] ?? emptyLibrary;
  const groups = libraryGroups(data.workouts, studentId, library);
  const remaining = groups.filter((g) => g.status !== 'removed');
  const filtered = remaining.filter(
    (g) =>
      (tab === 'Em uso'
        ? g.status !== 'archived'
        : g.status === 'archived' || g.status === 'saved') &&
      (!trainer || g.trainer === trainer) &&
      (!goal || g.goal === goal),
  );
  const last = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
  const current = Math.min(last, page);

  function change(key: string, action: LibraryAction) {
    const group = groups.find((g) => g.key === key);
    if (!group || group.status === 'removed') return;
    repo.updateExperience((state) => ({
      ...state,
      libraries: {
        ...state.libraries,
        [studentId]: changeLibrary(state.libraries?.[studentId] ?? emptyLibrary, key, action),
      },
    }));
    setConfirm('');
    setUndo(action === 'remove' ? { key, status: group.status, main: group.main } : null);
    setNotice(
      {
        main: 'Treino principal atualizado.',
        save: 'Ficha salva.',
        archive: 'Ficha arquivada em Salvos.',
        restore: 'Ficha restaurada em Em uso.',
        remove: 'Ficha removida da biblioteca. Seu histórico foi preservado.',
      }[action],
    );
  }
  function undoRemoval() {
    if (!undo) return;
    repo.updateExperience((state) => {
      const book = state.libraries?.[studentId] ?? emptyLibrary;
      return {
        ...state,
        libraries: {
          ...state.libraries,
          [studentId]: {
            ...book,
            main: book.main ?? (undo.main ? undo.key : undefined),
            entries: { ...book.entries, [undo.key]: undo.status },
          },
        },
      };
    });
    setUndo(null);
    setNotice('Remoção desfeita.');
  }
  return (
    <>
      <PageHeader
        eyebrow="Biblioteca pessoal"
        title="Meus treinos"
        description="As fichas entregues ficam aqui para você treinar, mesmo depois de encerrar um acompanhamento."
      />
      <nav className="library-tabs" aria-label="Seções da biblioteca">
        {tabs.map((t) => (
          <Button
            variant={tab === t ? 'default' : 'ghost'}
            key={t}
            aria-pressed={tab === t}
            onClick={() => {
              setTab(t);
              setPage(0);
              setConfirm('');
            }}
          >
            {t}
          </Button>
        ))}
      </nav>
      <div role="status" className="library-feedback">
        {notice}
        {undo && (
          <Button size="sm" variant="outline" onClick={undoRemoval}>
            Desfazer
          </Button>
        )}
      </div>
      {tab === 'Histórico' ? (
        <HistoryPage embedded />
      ) : (
        <>
          {remaining.length > 0 && (
            <div className="library-filters">
              <label>
                Profissional
                <select
                  className="native-select"
                  value={trainer}
                  onChange={(e) => {
                    setTrainer(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">Todos os profissionais</option>
                  {Array.from(new Set(remaining.map((g) => g.trainer)))
                    .sort()
                    .map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                </select>
              </label>
              <label>
                Objetivo
                <select
                  className="native-select"
                  value={goal}
                  onChange={(e) => {
                    setGoal(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">Todos os objetivos</option>
                  {Array.from(new Set(remaining.map((g) => g.goal).filter(Boolean)))
                    .sort()
                    .map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                </select>
              </label>
            </div>
          )}
          {!filtered.length && (
            <Panel>
              <EmptyState
                title={
                  remaining.length ? 'Nenhuma ficha nesta seleção.' : 'Sua biblioteca está pronta.'
                }
                description={
                  tab === 'Salvos'
                    ? 'Use as opções da ficha para salvar ou arquivar um programa.'
                    : 'As fichas atribuídas ao seu perfil aparecem aqui.'
                }
              />
            </Panel>
          )}
          {filtered.slice(current * pageSize, (current + 1) * pageSize).map((group) => (
            <section className="library-program" key={group.key} aria-label={group.title}>
              <header>
                <div>
                  <p className="eyebrow">
                    {group.trainer}
                    {group.goal && ' · ' + group.goal}
                  </p>
                  <h2>{group.title}</h2>
                </div>
                <div className="library-tags">
                  {group.main && (
                    <span>
                      <Star size={14} /> Principal
                    </span>
                  )}
                  {group.status === 'saved' && (
                    <span>
                      <Bookmark size={14} /> Salvo
                    </span>
                  )}
                  {group.status === 'archived' && (
                    <span>
                      <Archive size={14} /> Arquivado
                    </span>
                  )}
                </div>
              </header>
              <WorkoutCards workouts={group.days} studentView />
              <details className="library-options">
                <summary>
                  <Ellipsis size={17} /> Opções da ficha
                </summary>
                <div className="library-actions">
                  {!group.main && (
                    <Button size="sm" variant="outline" onClick={() => change(group.key, 'main')}>
                      <Star size={15} /> Usar como principal
                    </Button>
                  )}
                  {group.status === 'active' && (
                    <Button size="sm" variant="outline" onClick={() => change(group.key, 'save')}>
                      <Bookmark size={15} /> Salvar ficha
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      change(group.key, group.status === 'archived' ? 'restore' : 'archive')
                    }
                  >
                    {group.status === 'archived' ? <Check size={15} /> : <Archive size={15} />}{' '}
                    {group.status === 'archived' ? 'Restaurar ficha' : 'Arquivar ficha'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirm(group.key)}>
                    Remover da biblioteca
                  </Button>
                </div>
                {confirm === group.key && (
                  <div className="library-actions">
                    <p>Remover “{group.title}”? As sessões registradas serão mantidas.</p>
                    <Button size="sm" onClick={() => change(group.key, 'remove')}>
                      Confirmar remoção
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirm('')}>
                      Cancelar
                    </Button>
                  </div>
                )}
              </details>
            </section>
          ))}
          {last > 0 && (
            <nav className="library-actions" aria-label="Paginação das fichas">
              <Button disabled={!current} onClick={() => setPage(current - 1)}>
                Anterior
              </Button>
              <span>
                {current + 1} de {last + 1}
              </span>
              <Button disabled={current === last} onClick={() => setPage(current + 1)}>
                Próxima
              </Button>
            </nav>
          )}
        </>
      )}
    </>
  );
}
