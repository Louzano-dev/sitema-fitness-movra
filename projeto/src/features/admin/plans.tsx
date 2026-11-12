'use client';
import { useState } from 'react';
import { useDemo, useRepository } from '@/components/providers';
import { Feedback, Field, PageHeader, Panel } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Plan } from '@/domain/types';
import { errorMessage } from '@/domain/schemas';
function PlanCard({ plan, index }: { plan: Plan; index: number }) {
  const repository = useRepository();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Panel className={`plan-card ${index === 1 ? 'featured' : ''}`}>
      <p className="eyebrow">Plano demonstrativo {String(index + 1).padStart(2, '0')}</p>
      <h2>{plan.name}</h2>
      <div className="plan-limit">
        {plan.limit}
        <span>alunos / limite de referência</span>
      </div>
      <p>{plan.description}</p>
      <p className="form-help">
        Sem preço ou contratação nesta versão. O limite é informativo, sem controle de quota.
      </p>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          setError('');
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline">Editar plano demonstrativo</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar plano</DialogTitle>
            <DialogDescription>
              As alterações aparecem nas organizações vinculadas durante esta sessão.
            </DialogDescription>
          </DialogHeader>
          <form
            className="form-stack"
            onSubmit={async (event) => {
              event.preventDefault();
              const values = new FormData(event.currentTarget);
              setBusy(true);
              setError('');
              try {
                await repository.savePlan(plan.id, {
                  name: String(values.get('name')),
                  limit: Number(values.get('limit')),
                  description: String(values.get('description')),
                });
                setOpen(false);
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Nome do plano" htmlFor={`plan-name-${plan.id}`}>
              <Input
                id={`plan-name-${plan.id}`}
                name="name"
                defaultValue={plan.name}
                minLength={2}
                maxLength={100}
                required
              />
            </Field>
            <Field label="Limite ilustrativo de alunos" htmlFor={`plan-limit-${plan.id}`}>
              <Input
                id={`plan-limit-${plan.id}`}
                name="limit"
                type="number"
                min={1}
                max={10000}
                defaultValue={plan.limit}
                required
              />
            </Field>
            <Field label="Descrição" htmlFor={`plan-description-${plan.id}`}>
              <Textarea
                id={`plan-description-${plan.id}`}
                name="description"
                defaultValue={plan.description}
                required
                maxLength={250}
              />
            </Field>
            <Feedback error={error} />
            <Button type="submit" disabled={busy}>
              {busy ? 'Atualizando…' : 'Salvar plano na prévia'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
export function PlansPage() {
  const data = useDemo();
  return (
    <>
      <PageHeader
        eyebrow="Administração · planos"
        title="Uma estrutura para cada operação."
        description="Definições ilustrativas da oferta. Preços, cobrança e validação comercial ficam para uma etapa futura."
      />
      <div className="three-columns">
        {data.plans.map((p, i) => (
          <PlanCard key={p.id} plan={p} index={i} />
        ))}
      </div>
    </>
  );
}
