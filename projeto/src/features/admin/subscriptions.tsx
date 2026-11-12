'use client';
import { useState } from 'react';
import { useDemo } from '@/components/providers';
import { EmptyState, PageHeader, Panel, Status, TableRegion, TextLink } from '@/components/shared';
import { formatDate } from '@/domain/selectors';
export function SubscriptionsPage() {
  const data = useDemo();
  const [status, setStatus] = useState('all');
  const subscriptions = data.subscriptions.filter((s) => status === 'all' || s.status === status);
  return (
    <>
      <PageHeader
        eyebrow="Administração · assinaturas"
        title="Estados claros, sem cobrança real."
        description="Consulte assinaturas demonstrativas. Alterar uma organização atualiza a situação de sua assinatura local."
      />
      <Panel>
        <div className="toolbar">
          <label className="sr-only" htmlFor="subscription-status">
            Situação da assinatura
          </label>
          <select
            className="native-select"
            id="subscription-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Todas as situações</option>
            <option>Ativa</option>
            <option>Pausada</option>
          </select>
          <span className="toolbar-count" role="status">
            {subscriptions.length} assinaturas de exemplo
          </span>
        </div>
        {subscriptions.length ? (
          <TableRegion label="Assinaturas demonstrativas">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Organização</th>
                  <th scope="col">Plano</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Renovação ilustrativa</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => {
                  const org = data.organizations.find((o) => o.id === s.organizationId)!;
                  return (
                    <tr key={s.id}>
                      <td>{org.name}</td>
                      <td>{data.plans.find((p) => p.id === org.planId)?.name}</td>
                      <td>
                        <Status value={s.status} />
                      </td>
                      <td>{formatDate(s.renewal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableRegion>
        ) : (
          <EmptyState />
        )}
        <div className="panel-footer">
          <span>Nenhum pagamento é processado.</span>
          <TextLink href="/admin/organizacoes">Simular mudança na organização</TextLink>
        </div>
      </Panel>
    </>
  );
}
