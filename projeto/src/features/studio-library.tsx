'use client';
import { useState } from 'react';
import { useDemo, useRepository } from '@/components/providers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/shared';
import { type CatalogExercise } from '@/domain/exercise-catalog';
import { normalize } from '@/domain/selectors';
import { difficulty } from '@/domain/training-plan';
import { EQUIPMENT } from '@/domain/experience';

export function OwnExerciseForm({ saved }: { saved: (id: string) => void }) {
  const repo = useRepository();
  return (
    <details className="studio-advanced">
      <summary>Cadastrar exercício próprio</summary>
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const values = new FormData(form);
          const value = (key: string) => String(values.get(key) ?? '').trim();
          const id = repo.saveOwnExercise({
            name: value('name'),
            group: value('group'),
            equipment: value('equipment'),
            pattern: value('pattern'),
            difficulty: value('difficulty'),
            instructions: value('instructions'),
          });
          form.reset();
          saved(id);
        }}
      >
        <label>
          Nome do exercício
          <Input required name="name" maxLength={100} pattern=".*\S.*" />
        </label>
        <label>
          Grupo muscular
          <Input required name="group" maxLength={60} pattern=".*\S.*" />
        </label>
        <label>
          Padrão de movimento
          <Input required name="pattern" maxLength={50} pattern=".*\S.*" />
        </label>
        <label>
          Equipamento
          <select className="native-select" name="equipment">
            {EQUIPMENT.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
        <label>
          Dificuldade técnica
          <select className="native-select" name="difficulty">
            {['Básica', 'Moderada', 'Maior coordenação'].map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
        <label>
          Instruções de execução
          <Input required name="instructions" maxLength={500} pattern=".*\S.*" />
        </label>
        <Button type="submit">Salvar exercício na biblioteca</Button>
      </form>
    </details>
  );
}

export function StudioLibrary({
  catalog,
  onAdd,
  onClose,
  remaining,
}: {
  catalog: CatalogExercise[];
  onAdd: (id: string) => void;
  onClose: () => void;
  remaining: number;
}) {
  const data = useDemo();
  const [query, setQuery] = useState(''),
    [scope, setScope] = useState('Todos'),
    [chosen, setChosen] = useState(''),
    [feedback, setFeedback] = useState('');
  const candidates = catalog.filter(
    (e) =>
      normalize(
        [e.name, ...e.tags, e.equipment, e.pattern, e.difficulty ?? difficulty(e.id)].join(' '),
      ).includes(normalize(query)) &&
      (scope === 'Todos' ||
        (scope === 'Favoritos'
          ? data.experience.exerciseFavorites.includes(e.id)
          : e.id.startsWith('own-'))),
  );
  const selected = candidates.find((e) => e.id === chosen);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar exercícios ao dia</DialogTitle>
          <DialogDescription>
            Pesquise por nome, músculo, equipamento, padrão ou dificuldade. Adicione quantos
            precisar antes de voltar ao treino.
          </DialogDescription>
        </DialogHeader>
        <Field label="Pesquisar exercício para adicionar" htmlFor="studio-search">
          <Input
            id="studio-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
        <Field label="Origem dos exercícios" htmlFor="studio-scope">
          <select
            className="native-select"
            id="studio-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            {['Todos', 'Favoritos', 'Criados por mim'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Adicionar exercício" htmlFor="studio-add">
          <select
            id="studio-add"
            className="native-select"
            size={5}
            value={selected?.id ?? ''}
            onChange={(e) => setChosen(e.target.value)}
          >
            {candidates.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </Field>
        {!candidates.length && (
          <p>Nenhum exercício encontrado. Ajuste a busca ou cadastre um exercício.</p>
        )}
        {selected && (
          <p>
            {selected.group} · {selected.equipment} · {selected.pattern} · Dificuldade:{' '}
            {selected.difficulty ?? difficulty(selected.id)}
          </p>
        )}
        <Button
          disabled={!remaining || !selected}
          onClick={() => {
            if (selected) {
              onAdd(selected.id);
              setFeedback(selected.name + ' adicionado ao dia.');
            }
          }}
        >
          Adicionar ao dia
        </Button>
        <p role="status">{remaining ? feedback : 'O dia contém 20 exercícios.'}</p>
        <OwnExerciseForm
          saved={(id) => {
            setChosen(id);
            setScope('Criados por mim');
            setQuery('');
            setFeedback('Exercício salvo. Selecione Adicionar ao dia para usá-lo.');
          }}
        />
        <Button variant="outline" onClick={onClose}>
          Voltar à ficha
        </Button>
      </DialogContent>
    </Dialog>
  );
}
