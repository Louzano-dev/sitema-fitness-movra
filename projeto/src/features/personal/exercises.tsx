'use client';
import { useState } from 'react';
import { Activity, Search } from 'lucide-react';
import { useDemo } from '@/components/providers';
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
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [equipment, setEquipment] = useState('all');
  const exercises = data.exercises.filter(
    (e) =>
      normalize(e.name).includes(normalize(query)) &&
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
          {[...new Set(data.exercises.map((e) => e.group))].map((g) => (
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
          {[...new Set(data.exercises.map((e) => e.equipment))].map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </div>
      {exercises.length ? (
        <div className="exercise-grid">
          {exercises.map((e) => (
            <Panel className="exercise-card" key={e.id}>
              <div className="exercise-glyph" aria-hidden>
                <Activity strokeWidth={1.3} />
                <span className="tag">{e.equipment}</span>
              </div>
              <h2>{e.name}</h2>
              <p>{e.group}</p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Ver instruções</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{e.name}</DialogTitle>
                    <DialogDescription>
                      {e.group} · {e.equipment}
                    </DialogDescription>
                  </DialogHeader>
                  <p>{e.instructions}</p>
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
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        </Panel>
      )}
    </>
  );
}
