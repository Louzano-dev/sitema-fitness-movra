'use client';
import { useState } from 'react';
import { Info, Search } from 'lucide-react';
import { useDemo, useRepository } from '@/components/providers';
import {
  EmptyState,
  Feedback,
  Field,
  PageHeader,
  Panel,
  Status,
  TableRegion,
} from '@/components/shared';
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
import { errorMessage } from '@/domain/schemas';
import type { Organization } from '@/domain/types';
function OrganizationEditor({ organization }: { organization: Organization }) {
  const data = useDemo();
  const repository = useRepository();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        setError('');
        setSuccess('');
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Gerenciar ${organization.name}`}>
          Gerenciar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{organization.name}</DialogTitle>
          <DialogDescription>
            Simule a alteração de plano ou situação. Nenhuma organização ou cobrança real será
            alterada.
          </DialogDescription>
        </DialogHeader>
        <form
          key={organization.id}
          className="form-stack"
          onSubmit={async (event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            setBusy(true);
            setError('');
            setSuccess('');
            try {
              await repository.updateOrganization(
                organization.id,
                String(values.get('planId')),
                values.get('status') as 'Ativa' | 'Pausada',
              );
              setSuccess(
                'Organização e assinatura atualizadas na demonstração. Nenhuma cobrança foi realizada.',
              );
            } catch (e) {
              setError(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="form-help">Responsável fictício: {organization.owner}</p>
          <Field label="Plano" htmlFor={`org-plan-${organization.id}`}>
            <select
              className="native-select"
              id={`org-plan-${organization.id}`}
              name="planId"
              defaultValue={organization.planId}
            >
              {data.plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Situação" htmlFor={`org-status-${organization.id}`}>
            <select
              className="native-select"
              id={`org-status-${organization.id}`}
              name="status"
              defaultValue={organization.status}
            >
              <option>Ativa</option>
              <option>Pausada</option>
            </select>
          </Field>
          <Feedback error={error} success={success} />
          <Button type="submit" disabled={busy}>
            {busy ? 'Simulando…' : 'Confirmar alteração simulada'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function OrganizationsPage() {
  const data = useDemo();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const items = data.organizations.filter(
    (o) =>
      normalize(`${o.name} ${o.owner}`).includes(normalize(query)) &&
      (status === 'all' || o.status === status),
  );
  return (
    <>
      <PageHeader
        eyebrow="Administração · organizações"
        title="Cada operação, seu contexto."
        description="Consulte organizações fictícias e simule alterações de plano e situação."
      />
      <div className="notice">
        <Info size={18} aria-hidden />
        <p>
          Ambiente administrativo aberto para demonstração. Não existe autenticação, isolamento de
          produção ou acesso a dados reais.
        </p>
      </div>
      <Panel>
        <div className="toolbar">
          <div className="search-field">
            <label className="sr-only" htmlFor="org-query">
              Buscar organização
            </label>
            <Search size={17} aria-hidden />
            <Input
              id="org-query"
              placeholder="Buscar organização ou responsável"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <label className="sr-only" htmlFor="org-filter">
            Situação da organização
          </label>
          <select
            id="org-filter"
            className="native-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Todas as situações</option>
            <option>Ativa</option>
            <option>Pausada</option>
          </select>
          <span className="toolbar-count" role="status">
            {items.length} organizações
          </span>
        </div>
        {items.length ? (
          <TableRegion label="Organizações">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Organização</th>
                  <th scope="col" className="mobile-hide">
                    Responsável
                  </th>
                  <th scope="col">Plano</th>
                  <th scope="col">Situação</th>
                  <th scope="col">
                    <span className="sr-only">Gerenciar</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.id}>
                    <td>{o.name}</td>
                    <td className="mobile-hide">{o.owner}</td>
                    <td>{data.plans.find((p) => p.id === o.planId)?.name}</td>
                    <td>
                      <Status value={o.status} />
                    </td>
                    <td>
                      <OrganizationEditor organization={o} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableRegion>
        ) : (
          <EmptyState />
        )}
      </Panel>
    </>
  );
}
