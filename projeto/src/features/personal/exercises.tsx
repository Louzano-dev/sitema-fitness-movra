'use client';
import { useState } from 'react';
import { beginSharedSurface } from '@/components/shared-surface';
import { CardioLibrary } from '../cardio';
import { Activity, Search } from 'lucide-react';
import { useDemo, useRepository } from '@/components/providers';
import { OwnExerciseForm } from '../studio-library';
import { studioCatalog } from '@/domain/exercise-catalog';
import { EmptyState, PageHeader, Panel } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { normalize } from '@/domain/selectors';
export function ExercisesPage() {
  const data = useDemo();
  const repository = useRepository();
  const catalog = studioCatalog(data.exercises);
  const [saved, setSaved] = useState('');
  const [pattern, setPattern] = useState('all');
  const [category, setCategory] = useState('all');
  const [scope, setScope] = useState('all');
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [equipment, setEquipment] = useState('all');
  const [pageSize, setPageSize] = useState({ key: '', count: 24 });
  const filterKey = [pattern, category, scope, query, group, equipment].join('|');
  const limit = pageSize.key === filterKey ? pageSize.count : 24;
  const exercises = catalog.filter(
    (e) =>
      normalize(`${e.name} ${e.tags.join(' ')}`).includes(normalize(query)) &&
      (pattern === 'all' || e.pattern === pattern) &&
      (category === 'all' || e.category === category) &&
      (scope === 'all' ||
        (scope === 'favorites'
          ? data.experience.exerciseFavorites.includes(e.id)
          : data.experience.recentExercises.includes(e.id))) &&
      (group === 'all' || e.group === group) &&
      (equipment === 'all' || e.equipment === equipment),
  );
  return (
    <>
      <PageHeader
        eyebrow="Biblioteca de exercícios"
        title="O repertório de cada movimento."
        description="Consulte instruções e equipamentos para compor suas prescrições. Catálogo demonstrativo, sem vídeos ou prescrição automática."
      />
      <OwnExerciseForm
        saved={(id) => {
          setQuery(repository.getSnapshot().exercises.find((e) => e.id === id)?.name ?? '');
          setScope('all');
          setCategory('all');
          setPattern('all');
          setEquipment('all');
          setGroup('all');
          setSaved('Exercício próprio salvo na biblioteca.');
        }}
      />
      {saved && <p role="status">{saved}</p>}
      <CardioLibrary />
      <p className="form-help">
        {catalog.length} exercícios e variações disponíveis. Busque também pelo músculo, como
        peitoral, bíceps, glúteos ou panturrilhas.
      </p>
      <div className="toolbar mb-6 rounded-xl border bg-white">
        <div className="search-field">
          <label className="sr-only" htmlFor="exercise-query">
            Buscar exercício
          </label>
          <Search size={17} aria-hidden />
          <Input
            id="exercise-query"
            placeholder="Buscar exercício"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <label className="sr-only" htmlFor="exercise-group">
          Grupo muscular
        </label>
        <select
          className="native-select"
          id="exercise-group"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        >
          <option value="all">Todos os grupos</option>
          {[...new Set(catalog.map((e) => e.group))].map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="exercise-equipment">
          Equipamento
        </label>
        <select
          className="native-select"
          id="exercise-equipment"
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
        >
          <option value="all">Todos os equipamentos</option>
          {[...new Set(catalog.map((e) => e.equipment))].map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <FieldFilter
          label="Padrão de movimento"
          value={pattern}
          change={setPattern}
          options={[...new Set(catalog.map((e) => e.pattern))]}
        />
        <FieldFilter
          label="Categoria de exercício"
          value={category}
          change={setCategory}
          options={[...new Set(catalog.map((e) => e.category))]}
        />
        <FieldFilter
          label="Favoritos e recentes"
          value={scope}
          change={setScope}
          options={['favorites', 'recent']}
        />
      </div>
      {exercises.length ? (
        <div className="exercise-grid">
          {exercises.slice(0, limit).map((e) => (
            <Panel className="exercise-card" key={e.id}>
              <div className="exercise-glyph" aria-hidden>
                <Activity strokeWidth={1.3} />
                <span className="tag">{e.equipment}</span>
                <span className="media-placeholder">Mídia não cadastrada</span>
              </div>
              <h2>{e.name}</h2>
              <p>{e.group}</p>
              <p className="form-help">
                {e.pattern} · {e.category}
              </p>
              <Button
                variant="ghost"
                aria-label={`Favorito: ${e.name}`}
                aria-pressed={data.experience.exerciseFavorites.includes(e.id)}
                onClick={() =>
                  repository.updateExperience((state) => ({
                    ...state,
                    exerciseFavorites: state.exerciseFavorites.includes(e.id)
                      ? state.exerciseFavorites.filter((id) => id !== e.id)
                      : [...state.exerciseFavorites, e.id],
                  }))
                }
              >
                {data.experience.exerciseFavorites.includes(e.id)
                  ? '★ Favorito'
                  : '☆ Salvar favorito'}
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={(event) => {
                      beginSharedSurface(
                        event.currentTarget.closest<HTMLElement>('.exercise-card'),
                        '[data-slot="dialog-content"]',
                      );
                      repository.updateExperience((state) => ({
                        ...state,
                        recentExercises: [
                          e.id,
                          ...state.recentExercises.filter((id) => id !== e.id),
                        ].slice(0, 20),
                      }));
                    }}
                  >
                    Ver instruções
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{e.name}</DialogTitle>
                    <DialogDescription>
                      {e.group} · {e.equipment}
                    </DialogDescription>
                  </DialogHeader>
                  <p>{e.instructions}</p>
                  {!e.id.startsWith('own-') && (
                    <p className="form-help">
                      Orientação genérica de catálogo. A demonstração técnica deste exercício
                      aguarda validação profissional.
                    </p>
                  )}
                  <p>{e.technical}</p>
                  <p>Grupos secundários: {e.secondary.join(', ')}</p>
                  <p>
                    Alternativas no catálogo:{' '}
                    {e.alternatives
                      .map((id) => catalog.find((exercise) => exercise.id === id)?.name)
                      .join(', ') || 'Nenhuma cadastrada'}
                  </p>
                  <p className="form-help">
                    Conteúdo de exemplo. Orientações individuais e avaliação profissional são
                    necessárias em um atendimento real.
                  </p>
                </DialogContent>
              </Dialog>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel>
          <EmptyState
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery('');
                  setGroup('all');
                  setEquipment('all');
                  setPattern('all');
                  setCategory('all');
                  setScope('all');
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        </Panel>
      )}
      {exercises.length > limit && (
        <Button
          variant="outline"
          onClick={() => setPageSize({ key: filterKey, count: limit + 24 })}
        >
          Mostrar mais exercícios ({Math.min(limit, exercises.length)} de {exercises.length})
        </Button>
      )}
    </>
  );
}
function FieldFilter({
  label,
  value,
  change,
  options,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="filter-label">
      {label}
      <select className="native-select" value={value} onChange={(e) => change(e.target.value)}>
        <option value="all">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option === 'favorites' ? 'Favoritos' : option === 'recent' ? 'Recentes' : option}
          </option>
        ))}
      </select>
    </label>
  );
}
